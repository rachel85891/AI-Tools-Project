import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Section, Sector, Show, TargetAudience } from '../../../models/show-model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { CategorySrvice } from '../../../services/category-srvice';
import { Category } from '../../../models/category-model';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { Select } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SeatMap } from '../../../models/map-model';
import { DatePickerModule } from 'primeng/datepicker';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ProviderService } from '../../../services/provider-service';
import { Provider } from '../../../models/provider-model';
import { ShowsService } from '../../../services/shows-service';
import { AddProvider } from '../../providers/add-provider/add-provider';
import { ImageService } from '../../../services/image-service';
import { ChangeDetectorRef } from '@angular/core';
import { AddCategory } from '../../categories/add-category/add-category';
import { ConfirmationService } from 'primeng/api';
import { ToastService } from '../../../services/toast-service';

@Component({
  selector: 'app-edit-show',
  imports: [
    ToggleSwitchModule,
    RadioButtonModule,
    ButtonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Dialog,
    InputTextModule,
    AvatarModule,
    Select,
    FloatLabelModule,
    FileUploadModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    AddProvider,
    AddCategory,
  ],
  templateUrl: './edit-show.html',
  styleUrl: './edit-show.scss',
})
export class EditShow implements OnChanges {
  @Input() show: Show | null = null;
  /** When false, the trigger button is hidden (e.g. when parent opens the dialog). */
  @Input() showTriggerButton = true;
  
  @Output() showUpdated = new EventEmitter<Show>();

  readonly TargetAudience = TargetAudience;
  readonly Sector = Sector;
  targetAudienceOptions = Object.keys(TargetAudience)
    .filter((key) => isNaN(Number(key)))
    .map((key) => ({
      label: TargetAudience[key as keyof typeof TargetAudience],
      value: key,
    }));

  editForm: FormGroup;
  categorySrv: CategorySrvice = inject(CategorySrvice);
  categories: Category[] = [];
  providerSrv: ProviderService = inject(ProviderService);
  providers: Provider[] = [];
  showsSrv: ShowsService = inject(ShowsService);
  submitLoading = false;
  submitError: string | null = null;
  hallMap: SeatMap = new SeatMap(0, Section.HALL);
  leftBalMap: SeatMap = new SeatMap(0, Section.LEFT_BALCONY);
  rightBalMap: SeatMap = new SeatMap(0, Section.RIGHT_BALCONY);
  centerBalMap: SeatMap = new SeatMap(0, Section.CENTER_BALCONY);
  imagePreviewUrl: string | ArrayBuffer | null = null;
  selectedFile: any;
  visible = false;
  today: Date = new Date().getDate() as unknown as Date;
  checked: boolean[] = [true, false, false, false];
  imageSrv: ImageService = inject(ImageService);
  imagePreviewSignal = signal<string | ArrayBuffer | null>(null);
  private cd = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private toast = inject(ToastService);

  sectorOptions = Object.keys(Sector)
    .filter((key) => isNaN(Number(key)))
    .map((key) => ({
      label: Sector[key as keyof typeof Sector],
      value: Sector[key as keyof typeof Sector],
    }));

  @ViewChild('addProviderRef') addProviderRef!: AddProvider;
  @ViewChild('addCategoryRef') addCategoryRef!: AddCategory;

  constructor() {
    this.editForm = this.fb.group({
      title: [''],
      date: [new Date()],
      beginTime: [new Date()],
      endTime: [new Date()],
      audience: [TargetAudience.ADULTS],
      sector: [Sector.WOMEN],
      description: [''],
      providerId: [0],
      categoryId: [301],
      hallMapPrice: [0],
      centerBalMapPrice: [0],
      rightBalMapPrice: [0],
      leftBalMapPrice: [0],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['show'] && this.show) {
      this.patchFormFromShow(this.show);
    }
  }

  /** Initialize the form using patchValue() with existing show details. */
  private patchFormFromShow(s: Show): void {
    const date = s.date instanceof Date ? s.date : new Date(s.date);
    const beginTime = this.timeToDate(s.beginTime, date);
    const endTime = this.timeToDate(s.endTime, date);

    this.editForm.patchValue({
      id: s.id ?? 0,
      title: s.title.trim() ?? '',
      date,
      beginTime,
      endTime,
      audience: s.audience.trim() ?? TargetAudience.ADULTS,
      sector: s.sector.trim() ?? Sector.WOMEN,
      description: s.description.trim() ?? '',
      providerId: s.providerId ?? 0,
      categoryId: s.categoryId ?? 301,
      hallMapPrice: s.hallMap?.price ?? 0,
      centerBalMapPrice: s.centerBalMap?.price ?? 0,
      rightBalMapPrice: s.rightBalMap?.price ?? 0,
      leftBalMapPrice: s.leftBalMap?.price ?? 0,
    });

    this.hallMap = s.hallMap ? new SeatMap(s.hallMap.price ?? 0, Section.HALL) : new SeatMap(0, Section.HALL);
    this.leftBalMap = s.leftBalMap ? new SeatMap(s.leftBalMap.price ?? 0, Section.LEFT_BALCONY) : new SeatMap(0, Section.LEFT_BALCONY);
    this.rightBalMap = s.rightBalMap ? new SeatMap(s.rightBalMap.price ?? 0, Section.RIGHT_BALCONY) : new SeatMap(0, Section.RIGHT_BALCONY);
    this.centerBalMap = s.centerBalMap ? new SeatMap(s.centerBalMap.price ?? 0, Section.CENTER_BALCONY) : new SeatMap(0, Section.CENTER_BALCONY);

    this.checked[1] = (s.centerBalMap?.price ?? 0) > 0;
    this.checked[2] = (s.rightBalMap?.price ?? 0) > 0;
    this.checked[3] = (s.leftBalMap?.price ?? 0) > 0;

    if (s.imgUrl) {
      this.imagePreviewSignal.set('https://localhost:44304/' + s.imgUrl);
    } else {
      this.imagePreviewSignal.set(null);
    }
    this.selectedFile = null;
    this.submitError = null;
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.cd.markForCheck();
  }

  private timeToDate(value: string | Date | undefined, baseDate: Date): Date {
    if (value == null) return new Date(baseDate);
    if (value instanceof Date) return value;
    const str = String(value).substring(0, 5);
    const [h, m] = str.split(':').map(Number);
    const d = new Date(baseDate);
    d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
    return d;
  }

  showDialog(): void {
    this.loadCategories();
    this.loadProviders();
    if (this.show) {
      console.log('show', this.show);
      this.patchFormFromShow(this.show);
    }
    this.visible = true;
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProviders();
  }

  updateShow(): void {
    this.submitError = null;
    const v = this.editForm.value;
    const show = this.show ?? new Show();
    show.id = this.show?.id ?? 0;
    show.title = v.title;
    show.date = v.date;
    show.beginTime = v.beginTime;
    show.endTime = v.endTime;
    show.audience = v.audience ?? TargetAudience.ADULTS;
    show.sector = v.sector ?? Sector.WOMEN;
    show.description = v.description ?? '';
    show.providerId = v.providerId ?? 0;
    show.categoryId = v.categoryId ?? 301;
    this.hallMap.price = v.hallMapPrice ?? 0;
    this.centerBalMap.price = v.centerBalMapPrice ?? 0;
    this.rightBalMap.price = v.rightBalMapPrice ?? 0;
    this.leftBalMap.price = v.leftBalMapPrice ?? 0;
    show.hallMap = this.hallMap;
    show.leftBalMap = this.leftBalMap;
    show.rightBalMap = this.rightBalMap;
    show.centerBalMap = this.centerBalMap;

    const sectionPrices = [
      show.hallMap?.price,
      show.leftBalMap?.price,
      show.rightBalMap?.price,
      show.centerBalMap?.price,
    ].filter((p): p is number => typeof p === 'number' && p > 0);
    show.minPrice = sectionPrices.length > 0 ? Math.min(...sectionPrices) : 0;

    this.submitLoading = true;
    if (this.selectedFile) {
      this.imageSrv.upload(this.selectedFile).subscribe({
        next: (res) => {
          show.imgUrl = res.path;
          this.sendUpdateToServer(show);
        },
        error: (err) => {
          console.error('שגיאה בהעלאה', err);
          this.submitLoading = false;
          const msg = err?.error?.message ?? err?.message ?? 'העלאת התמונה נכשלה';
          this.submitError = msg;
          this.toast.error(msg);
        },
      });
    } else {
      this.sendUpdateToServer(show);
    }
  }

  private sendUpdateToServer(show: Show): void {
    if (!show.imgUrl && this.show?.imgUrl) {
      show.imgUrl = this.show.imgUrl;
    }
    this.showsSrv.updateShow(show).subscribe({
      next: () => {
        this.showUpdated.emit(show);
        this.visible = false;
        this.submitLoading = false;
        this.toast.success('המופע עודכן בהצלחה.');
      },
      error: (err) => {
        this.submitLoading = false;
        const msg = err?.error?.message ?? err?.message ?? 'עדכון המופע נכשל';
        this.submitError = msg;
        this.toast.error(msg);
      },
    });
  }

  cancelDialog(): void {
    if (this.submitLoading) return;
    if (!this.hasUnsavedChanges()) {
      this.visible = false;
      return;
    }
    this.confirmationService.confirm({
      header: 'ביטול עריכת מופע',
      message: 'לסגור את החלון בלי לשמור את השינויים?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'כן, סגור',
      rejectLabel: 'המשך עריכה',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.visible = false;
      },
    });
  }

  private hasUnsavedChanges(): boolean {
    return this.editForm.dirty || !!this.selectedFile;
  }

  onFileSelected(event: any): void {
    const files = event.currentFiles || event.files;
    if (event.files && event.files.length > 0) {
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

  removeImage(fileUpload: FileUpload): void {
    this.imagePreviewSignal.set(null);
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    fileUpload.clear();
  }

  openAddProvider(): void {
    this.addProviderRef?.showDialog();
  }

  openAddCategory(): void {
    this.addCategoryRef?.showDialog();
  }

  onProviderAdded(provider: Provider): void {
    this.loadProviders(provider.id);
  }

  onCategoryAdded(category: Category): void {
    this.loadCategories(category.id);
  }

  private loadProviders(selectedId?: number): void {
    this.providerSrv.loadProviders().subscribe({
      next: (providers) => {
        this.providers = providers;
        if (selectedId) {
          this.editForm.patchValue({ providerId: selectedId });
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading providers', err);
        this.toast.error('טעינת המפיקים נכשלה.');
      },
    });
  }

  private loadCategories(selectedId?: number): void {
    this.categorySrv.loadCategoriers().subscribe({
      next: (categories) => {
        this.categories = categories;
        if (selectedId) {
          this.editForm.patchValue({ categoryId: selectedId });
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading categories', err);
        this.toast.error('טעינת הקטגוריות נכשלה.');
      },
    });
  }
}
