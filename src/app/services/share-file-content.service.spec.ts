import { TestBed } from '@angular/core/testing';

import { ShareFileContentService } from './share-file-content.service';

describe('ShareFileContentService', () => {
  let service: ShareFileContentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareFileContentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
