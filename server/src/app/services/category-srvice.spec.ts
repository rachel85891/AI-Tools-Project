import { TestBed } from '@angular/core/testing';

import { CategorySrvice } from './category-srvice';

describe('CategorySrvice', () => {
  let service: CategorySrvice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategorySrvice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
