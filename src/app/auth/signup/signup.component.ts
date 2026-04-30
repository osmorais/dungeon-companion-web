import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = signal('');
  loading = signal(false);

  submit() {
    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('As senhas não coincidem.');
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.signup(this.email, this.password, this.fullName || undefined).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.errorMessage.set(err.error?.message ?? 'Erro ao criar conta. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
