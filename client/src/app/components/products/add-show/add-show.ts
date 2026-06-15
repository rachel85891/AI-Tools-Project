import {
  Component,
  EventEmitter,
  inject,
  Input,
  input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { Section, SECTION_TO_ID, Sector, Show, TargetAudience } from '../../../models/show-model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategorySrvice } from '../../../services/category-srvice';
import { Category } from '../../../models/category-model';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { Select } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { forkJoin } from 'rxjs';
import {
  FileUpload,
  FileUploadEvent,
  FileUploadHandlerEvent,
  FileUploadModule,
} from 'primeng/fileupload';
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
  selector: 'app-add-show',
  imports: [
    ToggleSwitchModule,
    RadioButtonModule,
    ButtonModule,
    CommonModule,
    FormsModule,
    Dialog,
    ButtonModule,
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
  templateUrl: './add-show.html',
  styleUrl: './add-show.scss',
})
export class AddShow {
  readonly TargetAudience = TargetAudience;
  readonly Sector = Sector;
  targetAudienceOptions = Object.keys(TargetAudience)
    .filter((key) => isNaN(Number(key))) // מסנן את האינדקסים המספריים
    .map((key) => ({
      label: TargetAudience[key as keyof typeof TargetAudience],
      value: key,
    }));
  show: Show = new Show();
  categorySrv: CategorySrvice = inject(CategorySrvice);
  categories: Category[] = [];
  providerSrv: ProviderService = inject(ProviderService);
  providers: Provider[] = [];
  showsSrv: ShowsService = inject(ShowsService);
  submitLoading = false;
  submitError: string | null = null;
  id: number = 0;
  title: string = '';
  date: Date = new Date();
  beginTime: Date = new Date();
  endTime: Date = new Date();
  audience?: TargetAudience;
  sector?: Sector;
  description: string = '';
  imgUrl: string | null = null;
  providerId: number = 0;
  categoryId: number =301;
  hallMap: SeatMap = new SeatMap(0, Section.HALL);
  leftBalMap: SeatMap = new SeatMap(0, Section.LEFT_BALCONY);
  rightBalMap: SeatMap = new SeatMap(0, Section.RIGHT_BALCONY);
  centerBalMap: SeatMap = new SeatMap(0, Section.CENTER_BALCONY);
  userName: string = 'Michal';
  imagePreviewUrl: string | ArrayBuffer | null = null;
  selectedFile: any;
  visible: boolean = false;
  selectedSector: string = '';
  today: Date = new Date().getDate() as unknown as Date;
  checked: boolean[] = [true, false, false, false];
  imageSrv: ImageService = inject(ImageService);
  imagePreviewSignal = signal<string | ArrayBuffer | null>(null);
  private cd = inject(ChangeDetectorRef);
  private confirmationService = inject(ConfirmationService);
  private toast = inject(ToastService);

  showDialog() {
    this.loadCategories();
    this.loadProviders(); // ensure providers are loaded when dialog opens (in case ngOnInit load was slow or failed)
    this.visible = true;
  }
  ngOnInit() {
    this.loadCategories();
    this.loadProviders();
    this.targetAudienceOptions = Object.keys(TargetAudience)
      .filter((key) => isNaN(Number(key))) // מסנן את האינדקסים המספריים
      .map((key) => ({
        label: TargetAudience[key as keyof typeof TargetAudience],
        value: key,
      }));
  }
  @Output()
  showReady: EventEmitter<Show> = new EventEmitter<Show>();

  private formatTime(value: string | Date | undefined): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.substring(0, 5);
    if (value instanceof Date) {
      const h = value.getHours().toString().padStart(2, '0');
      const m = value.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    }
    return '';
  }
  ngOnChanges() {}
  addShow() {
    this.submitError = null;
    this.show.minPrice = this.hallMap.price ?? 0;
    if (
      (this.leftBalMap.price ?? 0) > 0 &&
      (this.show.minPrice === 0 || this.leftBalMap.price! < this.show.minPrice)
    ) {
      this.show.minPrice = this.leftBalMap.price!;
    }
    if (
      (this.rightBalMap.price ?? 0) > 0 &&
      (this.show.minPrice === 0 || this.rightBalMap.price! < this.show.minPrice)
    ) {
      this.show.minPrice = this.rightBalMap.price!;
    }
    if (
      (this.centerBalMap.price ?? 0) > 0 &&
      (this.show.minPrice === 0 || this.centerBalMap.price! < this.show.minPrice)
    ) {
      this.show.minPrice = this.centerBalMap.price!;
    }
    this.show.title = this.title;
    this.show.date = this.date;
    this.show.beginTime = this.beginTime;
    this.show.endTime = this.endTime;
    this.show.audience = this.audience ?? TargetAudience.ADULTS;
    this.show.sector = this.sector ?? Sector.WOMEN;
    this.show.description = this.description;
    this.show.providerId = this.providerId;
    this.show.categoryId = this.categoryId;
    this.show.hallMap = this.hallMap;
    this.show.leftBalMap = this.leftBalMap;
    this.show.rightBalMap = this.rightBalMap;
    this.show.centerBalMap = this.centerBalMap;
    this.submitLoading = true;
    if (this.selectedFile) {
      this.imageSrv.upload(this.selectedFile).subscribe({
        next: (res) => {
          this.show.imgUrl = res.path;
          this.sendShowToServer();
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
      this.show.imgUrl = null;
      this.sendShowToServer();
    }
  }

  private sendShowToServer(): void {
    this.showsSrv.addShow(this.show).subscribe({
      next: (createdShow: any) => {
        // Extract the new Show ID returned from the backend
        const newShowId = createdShow.id || createdShow.Id;

        if (!newShowId) {
          // Fallback if ID is missing for some reason
          this.finishShowCreation(createdShow);
          return;
        }

        const sectionRequests = [];

        // 1. Hall is ALWAYS created
        sectionRequests.push(this.showsSrv.addSection(this.hallMap.price, newShowId, SECTION_TO_ID[Section.HALL]));

        // 2. Optional sections - created only if the manager checked them
        if (this.checked[1]) {
          sectionRequests.push(this.showsSrv.addSection(this.leftBalMap.price, newShowId, SECTION_TO_ID[Section.LEFT_BALCONY]));
        }
        if (this.checked[2]) {
          sectionRequests.push(this.showsSrv.addSection(this.rightBalMap.price, newShowId, SECTION_TO_ID[Section.RIGHT_BALCONY]));
        }
        if (this.checked[3]) {
          sectionRequests.push(this.showsSrv.addSection(this.centerBalMap.price, newShowId, SECTION_TO_ID[Section.CENTER_BALCONY]));
        }

        // Execute all section POST requests concurrently
        forkJoin(sectionRequests).subscribe({
          next: () => {
            this.finishShowCreation(createdShow);
          },
          error: (err) => {
            console.error('Error saving sections', err);
            this.submitLoading = false;
            const msg = 'המופע נוצר, אך חלה שגיאה בשמירת האזורים.';
            this.submitError = msg;
            this.toast.error(msg);
          }
        });
      },
      error: (err) => {
        this.submitLoading = false;
        const msg = err?.error?.message ?? err?.message ?? 'שמירת המופע נכשלה';
        this.submitError = msg;
        this.toast.error(msg);
      },
    });
  }

  // Helper method to finalize UI state after all API calls finish
  private finishShowCreation(createdShow: any) {
    this.showReady.emit(createdShow);
    this.reset();
    this.visible = false;
    this.submitLoading = false;
    this.toast.success('המופע נוסף בהצלחה.');
  }

  cancelDialog(): void {
    if (this.submitLoading) return;
    if (!this.hasUnsavedChanges()) {
      this.visible = false;
      return;
    }
    this.confirmationService.confirm({
      header: 'ביטול הוספת מופע',
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
    return Boolean(
      this.title?.trim() ||
      this.description?.trim() ||
      this.selectedFile ||
      this.providerId > 0 ||
      this.categoryId !== 301 ||
      (this.hallMap.price ?? 0) > 0 ||
      (this.leftBalMap.price ?? 0) > 0 ||
      (this.rightBalMap.price ?? 0) > 0 ||
      (this.centerBalMap.price ?? 0) > 0 ||
      this.checked.some((checked, index) => index > 0 && checked),
    );
  }
  reset() {
    this.title = '';
    this.date = new Date();
    this.beginTime = new Date();
    this.endTime = new Date();
    this.audience = undefined;
    this.sector = undefined;
    this.description = '';
    this.imgUrl = null;
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.providerId = null as unknown as number;
    this.categoryId = 301;
    this.hallMap = new SeatMap(0, Section.HALL);
    this.leftBalMap = new SeatMap(0, Section.LEFT_BALCONY);
    this.rightBalMap = new SeatMap(0, Section.RIGHT_BALCONY);
    this.centerBalMap = new SeatMap(0, Section.CENTER_BALCONY);
    this.imagePreviewSignal.set(null);
    this.checked.fill(false, 1);
    this.providerId = null as unknown as number;
    this.show.popularity = 0;
    this.show = new Show();
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
  removeImage(fileUpload: FileUpload) {
    this.imagePreviewSignal.set(null);
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    fileUpload.clear();
  }
  sectorOptions = Object.keys(Sector)
    .filter((key) => isNaN(Number(key)))
    .map((key) => ({
      label: Sector[key as keyof typeof Sector],
      value: Sector[key as keyof typeof Sector], // כאן אנחנו שומרים את הערך ("גברים"), לא את המפתח (MEN)
    }));

  @ViewChild('addProviderRef') addProviderRef!: AddProvider;
  @ViewChild('addCategoryRef') addCategoryRef!: AddCategory;

  openAddProvider() {
    this.addProviderRef?.showDialog();
  }
  openAddCategory() {
    this.addCategoryRef?.showDialog();
  }
  onProviderAdded(provider: Provider) {
    // אותו תיקון גם עבור מפיקים
    this.loadProviders(provider.id);
  }
  onCategoryAdded(category: Category) {
    // מעבירים את ה-ID לפונקציית הטעינה כדי שיעודכן בסיום
    this.loadCategories(category.id);
  }
  private loadProviders(selectedId?: number) {
    this.providerSrv.loadProviders().subscribe({
      next: (providers) => {
        this.providers = providers;
        if (selectedId) {
          this.providerId = selectedId;
        }
        this.cd.detectChanges(); 
      },
      error: (err) => {
        console.error('Error loading providers', err);
        this.toast.error('טעינת המפיקים נכשלה.');
      },
    });
  }
  private loadCategories(selectedId?: number) {
    this.categorySrv.loadCategoriers().subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Categories from server:', categories);
        // עדכון הערך הנבחר מתבצע רק אחרי שהרשימה מכילה את הקטגוריה החדשה
        if (selectedId) {
          this.categoryId = selectedId;
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
