import { Component, ElementRef, OnInit } from '@angular/core';

import { HttpClientModule } from '@angular/common/http';
import { ShareFileContentService } from 'src/app/services/share-file-content.service';
import { ViewChild } from '@angular/core';

@Component({
	selector: 'app-test-file-reader',
	templateUrl: './test-file-reader.component.html',
	styleUrls: ['./test-file-reader.component.scss']
})
export class TestFileReaderComponent implements OnInit {

	csvContent: string;

	dataString: any;
	configString: any;

	dataReady = false;
	configReady = false;


	public mydatafile;
	public myconfigfile;

	constructor(
		private shareFileContent: ShareFileContentService
	) { }

	@ViewChild('inputDataset')
	inputDataset: ElementRef;

	@ViewChild('inputConfig')
	inputConfig: ElementRef;

	ngOnInit(): void {
	}

	public uploadListener(input) {
		console.log(input);
	}

	onFileLoad(fileLoadedEvent) {
		const textFromFileLoaded = fileLoadedEvent.target.result;
		this.csvContent = textFromFileLoaded;
		// alert(this.csvContent);
	}

	public onDataFileSelect(input) {

		const target = input.target;
		const files = target.files;
		// var content = this.csvContent;
		// console.log(files);
		if (files && files.length) {
			const fileToRead = files[0];
			const title = fileToRead.name;
			const fileReader = new FileReader();
			fileReader.onload = this.onFileLoad;
			// fileReader.readAsText(fileToLoad, "UTF-8");
			fileReader.readAsText(fileToRead, "UTF-8");

			fileReader.onloadend = (e) => {
				const fileString = fileReader.result;
				this.dataString = {
					"title": title,
					"string": fileString
				}
				this.dataReady = true;
			};
		}
	}

	public onConfigFileSelect(input) {
		const target = input.target;
		const files = target.files;
		// var content = this.csvContent;
		// console.log(files);
		if (files && files.length) {
			const fileToRead = files[0];
			const title = fileToRead.name;
			const fileReader = new FileReader();
			fileReader.onload = this.onFileLoad;
			// fileReader.readAsText(fileToLoad, "UTF-8");
			fileReader.readAsText(fileToRead, "UTF-8");

			fileReader.onloadend = (e) => {
				const fileString = fileReader.result;
				this.configString = {
					"title": title,
					"string": fileString
				}
				this.configReady = true;
			};
		}
	}

	public beginParser() {
		// this.dataReady = false;
		// this.configReady = false;

		console.log(this.inputDataset);
		this.inputDataset.nativeElement.value = "";
		this.inputConfig.nativeElement.value = "";

		this.shareFileContent.fileContentAdded.emit([this.dataString, this.configString]);
	}

}
