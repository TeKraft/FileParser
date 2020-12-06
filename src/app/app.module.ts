import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TestFileReaderComponent } from './components/test-file-reader/test-file-reader.component';
import { FileParserComponent } from './file-parser/file-parser.component';

import {FormsModule} from '@angular/forms'


@NgModule({
	declarations: [
		AppComponent,
		TestFileReaderComponent,
		FileParserComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		FormsModule
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule { }
