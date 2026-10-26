<?php
/**
 * Envio do e-mail de recuperação de senha (1.12.1). A api (Render) não consegue usar SMTP — o
 * Render bloqueia as portas de e-mail —, então ela chama este script por HTTPS e ele envia pelo
 * SMTP da Hostinger, com a conta de e-mail do site.
 *
 * - Só aceita POST com JSON {email, token} assinado pela api: cabeçalhos X-Forja-Timestamp
 *   (segundos) e X-Forja-Signature = HMAC-SHA256 hex de "<timestamp>.<corpo>" com o segredo
 *   compartilhado. Assinatura errada ou com mais de 5 minutos: 401.
 * - Só sabe mandar este e-mail: monta o link e o texto aqui, a partir do token. Mesmo com o segredo
 *   vazado, não serve pra mandar conteúdo qualquer.
 * - Segredo e senha do e-mail ficam em forja-mail-config.php, FORA do git e fora da pasta pública
 *   (um nível acima do public_html), criado à mão no painel da Hostinger.
 * - Não grava nem registra o e-mail de ninguém.
 */

const MAX_SKEW_SECONDS = 300;

function respond(int $status, string $error = ''): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo $error === '' ? '{"ok":true}' : json_encode(['error' => $error]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'method');
}

// public_html/mail/recuperar-senha.php → ../../forja-mail-config.php (fora do public_html).
$configPath = dirname(__DIR__, 2) . '/forja-mail-config.php';
if (!is_file($configPath)) {
    respond(500, 'config');
}
$config = require $configPath;
foreach (['secret', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'from'] as $key) {
    if (empty($config[$key])) {
        respond(500, 'config');
    }
}

$body = file_get_contents('php://input');
$timestamp = $_SERVER['HTTP_X_FORJA_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_FORJA_SIGNATURE'] ?? '';
if (!ctype_digit($timestamp) || abs(time() - (int) $timestamp) > MAX_SKEW_SECONDS) {
    respond(401, 'signature');
}
$expected = hash_hmac('sha256', $timestamp . '.' . $body, $config['secret']);
if (!is_string($signature) || !hash_equals($expected, $signature)) {
    respond(401, 'signature');
}

$data = json_decode($body, true);
$email = is_array($data) ? ($data['email'] ?? '') : '';
$token = is_array($data) ? ($data['token'] ?? '') : '';
if (
    !is_string($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)
    || !is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)
) {
    respond(400, 'input');
}

$frontendUrl = rtrim($config['frontend_url'] ?? 'https://forjaarcana.com', '/');
$link = $frontendUrl . '/reset-password?token=' . $token;
$html = password_reset_html($link, $frontendUrl . '/forja_arcana.png');

try {
    smtp_send($config, $email, '🗝️ Redefinição de Senha - Forja Arcana', $html);
} catch (Throwable $e) {
    // Só o motivo técnico, sem o endereço.
    error_log('[recuperar-senha] envio falhou: ' . $e->getMessage());
    respond(502, 'smtp');
}
respond(200);

/** Cliente SMTP mínimo (SSL implícito na 465, AUTH LOGIN), sem dependência externa. */
function smtp_send(array $config, string $to, string $subject, string $html): void
{
    $host = $config['smtp_host'];
    $port = (int) $config['smtp_port'];
    $context = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $socket = @stream_socket_client("ssl://$host:$port", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) {
        throw new RuntimeException("conexão: $errstr ($errno)");
    }
    stream_set_timeout($socket, 15);

    $expect = function (array $codes) use ($socket): void {
        $reply = '';
        while (($line = fgets($socket, 515)) !== false) {
            $reply .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }
        $code = (int) substr($reply, 0, 3);
        if (!in_array($code, $codes, true)) {
            throw new RuntimeException('resposta inesperada: ' . trim($reply));
        }
    };
    $send = function (string $line) use ($socket): void {
        fwrite($socket, $line . "\r\n");
    };

    $from = $config['from'];
    $domain = substr(strrchr($from, '@'), 1) ?: 'localhost';
    $expect([220]);
    $send("EHLO $domain");
    $expect([250]);
    $send('AUTH LOGIN');
    $expect([334]);
    $send(base64_encode($config['smtp_user']));
    $expect([334]);
    $send(base64_encode($config['smtp_pass']));
    $expect([235]);
    $send("MAIL FROM:<$from>");
    $expect([250]);
    $send("RCPT TO:<$to>");
    $expect([250, 251]);
    $send('DATA');
    $expect([354]);

    $headers = [
        'Date: ' . date('r'),
        'From: =?UTF-8?B?' . base64_encode('Forja Arcana') . "?= <$from>",
        "To: <$to>",
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'Message-ID: <' . bin2hex(random_bytes(16)) . "@$domain>",
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    // Corpo em base64 (linhas de 76): nenhuma linha começa com ".", sem precisar de dot-stuffing.
    $message = implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($html), 76, "\r\n"));
    $send($message);
    $send('.');
    $expect([250]);
    $send('QUIT');
    fclose($socket);
}

/** O mesmo e-mail que a api mandava (antes em password-reset.template.ts). */
function password_reset_html(string $link, string $logoUrl): string
{
    $link = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $logoUrl = htmlspecialchars($logoUrl, ENT_QUOTES, 'UTF-8');
    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de Senha</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d1a;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="$logoUrl" alt="Forja Arcana" width="120" height="120"
                   style="display:block;image-rendering:pixelated;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="
              background-color:#1a1a2e;
              border:3px solid #7c3aed;
              box-shadow:4px 4px 0 #4c1d95;
              padding:36px 40px;
            ">

              <!-- Title -->
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:4px;color:#7c3aed;text-transform:uppercase;">
                ✦ MISSÃO RECEBIDA ✦
              </p>
              <h1 style="margin:0 0 24px;font-size:22px;color:#e2e8f0;letter-spacing:2px;line-height:1.3;">
                REDEFINIÇÃO<br/>DE SENHA
              </h1>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-top:2px solid #7c3aed;font-size:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Body text -->
              <p style="margin:0 0 12px;font-size:14px;color:#94a3b8;line-height:1.7;">
                Saudações, Aventureiro.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.7;">
                Uma solicitação de redefinição de senha foi registrada nos grimórios da Forja Arcana.
                Se foi você, use o feitiço abaixo para forjar uma nova senha. O encantamento expira em
                <strong style="color:#e2e8f0;">1 hora</strong>.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="
                    background-color:#7c3aed;
                    box-shadow:4px 4px 0 #4c1d95;
                  ">
                    <a href="$link" style="
                      display:inline-block;
                      padding:14px 32px;
                      font-family:'Courier New',Courier,monospace;
                      font-size:13px;
                      font-weight:bold;
                      letter-spacing:3px;
                      text-transform:uppercase;
                      color:#ffffff;
                      text-decoration:none;
                    ">▶ REDEFINIR SENHA</a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 24px;font-size:11px;color:#64748b;line-height:1.6;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br/>
                <a href="$link" style="color:#7c3aed;word-break:break-all;">$link</a>
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="border-top:2px solid #2d2d4e;font-size:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Warning -->
              <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;">
                ⚠ Se você não solicitou esta redefinição, ignore esta mensagem. Sua senha permanece protegida.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4a5568;letter-spacing:2px;">
                FORJA ARCANA © 2025 · TODOS OS DIREITOS RESERVADOS
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}
