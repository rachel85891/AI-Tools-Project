import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowShow } from './show-show';

describe('ShowShow', () => {
  let component: ShowShow;
  let fixture: ComponentFixture<ShowShow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowShow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShowShow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
