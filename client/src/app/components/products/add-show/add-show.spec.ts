import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddShow } from './add-show';

describe('AddShow', () => {
  let component: AddShow;
  let fixture: ComponentFixture<AddShow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddShow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddShow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
