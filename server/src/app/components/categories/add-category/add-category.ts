import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { Category } from '../../../models/category-model';
import { CategorySrvice } from '../../../services/category-srvice';
import { ImageService } from '../../../services/image-service';

@Component({
  selector: 'app-add-category',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
  ],
  templateUrl: './add-category.html',
  styleUrl: './add-category.scss',
})
export class AddCategory {
  categorySrv = inject(CategorySrvice);
  imageSrv: ImageService = inject(ImageService);
  visible = false;
  name = '';
  imagePreviewUrl: string | ArrayBuffer | null = null;
  imagePreviewSignal = signal<string | ArrayBuffer | null>(null);
  selectedFile: File | null = null;
  submitLoading = false;
  submitError: string | null = null;
  @Output() categoryAdded = new EventEmitter<Category>();

  showDialog() {
    this.visible = true;
    this.reset();
  }

  hideDialog() {
    this.visible = false;
  }

  addCategory() {
    this.submitError = null;
    const category = new Category();
    category.name = this.name;
    this.submitLoading = true;
    this.sendCategoryToServer(category);
  }

  private sendCategoryToServer(category: Category): void {
    this.categorySrv.addCategory(category).subscribe({
      next: (created) => {
        this.categoryAdded.emit(created);
        this.reset();
        this.visible = false;
        this.submitLoading = false;
      },
      error: (err) => {
        this.submitLoading = false;
        this.submitError = err?.error?.message ?? err?.message ?? 'שמירת הקטגוריה נכשלה';
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
}
