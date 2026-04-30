import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = signal('');
  loading = signal(false);

  submit() {
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.errorMessage.set(err.error?.message ?? 'Erro ao entrar. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
