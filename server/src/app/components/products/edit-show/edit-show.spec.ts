import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditShow } from './edit-show';

describe('EditShow', () => {
  let component: EditShow;
  let fixture: ComponentFixture<EditShow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditShow],
    }).compileComponents();

    fixture = TestBed.createComponent(EditShow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
