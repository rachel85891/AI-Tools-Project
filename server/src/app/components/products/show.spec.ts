import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowsComponent } from './show';
describe('ShowsComponent', () => {
  let component: ShowsComponent;
  let fixture: ComponentFixture<ShowsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShowsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
