import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { Provider } from '../../../models/provider-model';
import { ProviderService } from '../../../services/provider-service';
import { ImageService } from '../../../services/image-service';

@Component({
  selector: 'app-add-provider',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    FileUploadModule,
  ],
  templateUrl: './add-provider.html',
  styleUrl: './add-provider.scss',
})
export class AddProvider {
  providerSrv = inject(ProviderService);
  imageSrv: ImageService = inject(ImageService);
  visible = false;
  name = '';
  imagePreviewUrl: string | ArrayBuffer | null = null;
  imagePreviewSignal = signal<string | ArrayBuffer | null>(null);
  selectedFile: File | null = null;
  submitLoading = false;
  submitError: string | null = null;
  @Output() providerAdded = new EventEmitter<Provider>();

  showDialog() {
    this.visible = true;
    this.reset();
  }

  hideDialog() {
    this.visible = false;
  }

  addProvider() {
    this.submitError = null;
    const provider = new Provider();
    provider.name = this.name;
    this.submitLoading = true;
    if (this.selectedFile) {
      this.imageSrv.upload(this.selectedFile).subscribe({
        next: (res) => {
          provider.profileimgUrl = res.path;
          this.sendProviderToServer(provider);
        },
        error: (err) => {
          console.error('שגיאה בהעלאה', err);
          this.submitLoading = false;
          this.submitError = err?.error?.message ?? err?.message ?? 'העלאת התמונה נכשלה';
        },
      });
    } else {
      provider.profileimgUrl = '';
      this.sendProviderToServer(provider);
    }
  }

  private sendProviderToServer(provider: Provider): void {
    this.providerSrv.addProvider(provider).subscribe({
      next: (created) => {
        this.providerAdded.emit(created);
        this.reset();
        this.visible = false;
        this.submitLoading = false;
      },
      error: (err) => {
        this.submitLoading = false;
        this.submitError = err?.error?.message ?? err?.message ?? 'שמירת המפיק נכשלה';
      },
    });
  }

  reset() {
    this.name = '';
    this.imagePreviewUrl = null;
    this.imagePreviewSignal.set(null);
    this.selectedFile = null;
    this.submitError = null;
  }

  onFileSelected(event: { currentFiles?: File[]; files?: File[] }) {
    const files = event.currentFiles ?? event.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewSignal.set(reader.result);
        this.imagePreviewUrl = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(fileUpload: FileUpload) {
    this.imagePreviewSignal.set(null);
    this.imagePreviewUrl = null;
    this.selectedFile = null;
    fileUpload.clear();
  }
}
