import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  newPassword = '';
  confirmPassword = '';
  errorMessage = signal('');
  loading = signal(false);

  submit() {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('As senhas não coincidem.');
      return;
    }
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.errorMessage.set('Token inválido ou ausente.');
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.resetPassword(token, this.newPassword).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { reset: 'success' } }),
      error: err => {
        this.errorMessage.set(err.error?.message ?? 'Erro ao redefinir senha. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
