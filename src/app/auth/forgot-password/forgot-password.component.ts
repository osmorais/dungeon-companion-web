import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  email = '';
  successMessage = signal('');
  errorMessage = signal('');
  loading = signal(false);

  submit() {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.forgotPassword(this.email).subscribe({
      next: res => {
        this.successMessage.set(res.message);
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(err.error?.message ?? 'Erro ao enviar e-mail. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
