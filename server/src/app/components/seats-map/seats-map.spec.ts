import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeatsMap } from './seats-map';

describe('SeatsMap', () => {
  let component: SeatsMap;
  let fixture: ComponentFixture<SeatsMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeatsMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeatsMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
