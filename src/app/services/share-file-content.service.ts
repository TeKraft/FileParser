import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class ShareFileContentService {
	fileContentAdded = new EventEmitter();
}
