import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestFileReaderComponent } from './test-file-reader.component';

describe('TestFileReaderComponent', () => {
	let component: TestFileReaderComponent;
	let fixture: ComponentFixture<TestFileReaderComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [TestFileReaderComponent]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TestFileReaderComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
