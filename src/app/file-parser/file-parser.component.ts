import { Component, OnInit, ɵSWITCH_ELEMENT_REF_FACTORY__POST_R3__ } from '@angular/core';
import { ShareFileContentService } from '../services/share-file-content.service';

import * as moment from 'moment';
import _ from "lodash";

@Component({
	selector: 'app-file-parser',
	templateUrl: './file-parser.component.html',
	styleUrls: ['./file-parser.component.scss']
})
export class FileParserComponent implements OnInit {

	public numberColumn: number;
	public numberRow: number;
	public selectedValue: Boolean = false;
	public outputArray;

	private dataContent = [];
	private dataString;
	private cfgContent;

	private dataTitle;
	private cfgTitle;

	private globalVocabularies = [];

	public submitNumbersReady = false;

	private dataColumnLength = -1;

	private vocabularyMain = "";

	private metadataRow = [];
	private metadataGlobal = [];
	private metadataColumn = [];

	private dataBlockSubmit = [];

	private dataSeparator = null;

	private filename = [];

	private block1;
	private block2;
	private selectedRowHeader = { idx: -1, exists: false };

	constructor(
		private shareFileContent: ShareFileContentService
	) { }

	ngOnInit(): void {
		// subscribe receives the value.
		this.shareFileContent.fileContentAdded.subscribe((str) => {

			// console.log(str);

			this.outputArray = [];
			this.metadataGlobal = [];
			this.dataBlockSubmit = [];
			this.dataContent = [];
			this.dataString = null;
			this.cfgContent = null;
			this.dataTitle = null;
			this.submitNumbersReady = false;
			this.dataColumnLength = -1;
			this.vocabularyMain = "";
			this.metadataRow = [];
			this.dataSeparator = null;

			/*
			0: DATA -> title: title | string: content
			1: CFG -> title: title | string: content
			*/


			/**		TODOs - Order
			 * 
			 * 1. file
			 * 		- name
			 * 		- path
			 * 2. special characters
			 * 3. trim
			 * 4. metadata
			 * 5. data
			 * 6. vocabularyTerms
			 * 
			 */

			//  TODO: str.trim() von allen strings die geparsed werden

			this.dataTitle = str[0].title;
			this.dataString = str[0].string;

			this.cfgTitle = str[1].title;
			this.cfgContent = JSON.parse(str[1].string);

			// console.log(this.dataTitle);
			// console.log(this.dataString);
			// console.log(this.cfgTitle);
			// console.log(this.cfgContent);

			this.startParsing();

		});
	}

	public startParsing() {
		this.submitNumbersReady = false;
		this.filename = [];
		this.metadataGlobal = [];
		if (this.cfgContent.file && this.cfgContent.file.name) {
			console.log('##### start parsing #####');

			if (this.cfgContent.file.name.literal && this.dataTitle === this.cfgContent.file.name.literal) {
				this.identifyRowBreaks();
			} else if (this.cfgContent.file.name.structureGroup && this.cfgContent.file.name.structureGroup.length > 0) {
				this.filename = this.processFileNameStructureGroup(this.cfgContent.file.name.structureGroup, this.dataTitle, [], "", false);
				this.identifyRowBreaks();
			} else {
				console.error('Filenames do not match');
			}
		} else {
			console.log('##### start parsing with cfg file not matching the filename #####');
			this.identifyRowBreaks();
		}
	}

	private identifyRowBreaks() {
		console.log('start identifying row breaks ...');
		// TODO: ???? parse row by row - gut für separator symbol, das nur bezogen auf bestimmte rows ist

		const tsRows = this.dataString.split('\n');
		this.dataContent = tsRows;
		// TODO: check for quotation marks and escape symbols
		if (this.cfgContent['specialCharacters'].separator !== '') {
			this.dataSeparator = this.cfgContent['specialCharacters'].separator;
			// tsRows.forEach(row => {
			// 	const rowSplitted = row.split(this.cfgContent['special characters'].separator);
			// 	this.dataContent.push(rowSplitted);
			// });
		} else {
			console.log('no special char');
		}

		console.log('finished identifying row breaks.');
		this.trimming();
	}

	private trimming() {
		console.log('start trim ...');

		if (this.cfgContent.trim && this.cfgContent.trim.length > 0) {
			let idxTrimCounter = 0;
			for (let i = 0; i < this.cfgContent.trim.length; i++) {
				let trimObj = this.cfgContent.trim[i];
				if (trimObj.idx !== "" && (trimObj.literal ? trimObj.literal === "" : true)) {
					this.dataContent.splice(trimObj.idx, 1);
					idxTrimCounter++;
				} else if (trimObj.literal !== "") {
					// TODO: also for value and column
					if (trimObj.what === "Row") {
						let foundIdx = this.dataContent.findIndex(el => el.includes(trimObj.literal));
						this.dataContent.splice(foundIdx, 1);
						idxTrimCounter++;
					}
					if (trimObj.what === "Literal") {
						this.dataContent[i - idxTrimCounter] = this.dataContent[i - idxTrimCounter].replace(trimObj.literal, "").trim();
					}
				}

			}
		}

		console.log('finished trim.');
		this.identifyBlock();
	}

	private identifyBlock() {
		console.log('start identifying metadata and data block ...');

		let currMetadataObj = [];
		let currIdx = 0;
		let dataBlock = [];
		let checkDataBlock = _.cloneDeep(this.dataContent);

		// identify metadata objects
		if (this.cfgContent.metadata.length > 0) {
			this.cfgContent.metadata.forEach(el => {

				let minIdx = 0;
				let maxIdx;

				if (el.identifier) {
					if (el.identifier.idx && el.identifier.idx.start) {
						// set identifier index
						minIdx = el.identifier.idx.start;
						maxIdx = el.identifier.idx.end ? el.identifier.idx.end : null;
					}
				}


				// TODOs:
				if (el.keyvalue) {

					console.log('to be implemented');

					this.dataColumnLength = -1;

				}
				if (el.line === "Column") { }

				// TODO: check separator

				/*
				TODO: für column analog zu row, solange fixedPosition,
				falls nicht fixedPosition muss anders nach identifier gesucht werden,
				für mehrere metadata objects muss der minIdx angepasst werden, sofern fixedPosition
						= Funktion, die mehrmals hintereinander aufgerufen wird
				*/

				if (el.line === "Row") {
					// nicht transponiert - metadaten in Zeilenformat und daten in Spaltenformat

					if (el.identifier && (el.identifier.literal ? el.identifier.literal === "" : true)) {
						// without identifier, but with index -> fixedPosition and index starting with first line in datablock (idx===0)
						for (let i = minIdx; i < el.lines.length; i++) {
							const line = el.lines[i];
							// wichtig für falls mehrmals hintereinander ist der neue minIdx ===>>> currIdx 
							// bzw der neue minIdx ==> new minIdx - currIdx, da array startet bei 0 weil slice und minIdx müsste bei ende des vorherigen arrays sein

							if (line.skip) {
								if (i === el.lines.length - 1) {
									dataBlock = this.dataContent.slice(i + 1, this.dataContent.length);
									checkDataBlock.splice(i - currIdx, 1);
									currIdx++;
								}
								continue;
							}

							if (line.fixedPosition || (!line.fixedPosition && el.lines.length <= 1)) {
								let splittedLine = this.dataContent[i].split(el.separator !== "" ? el.separator : this.dataSeparator);
								splittedLine = splittedLine.map(el => el.trim());
								let metaInfo = {
									cfgFile: line,
									dataFile: splittedLine
								}
								if (el.keyvalue) {
									// TODO check for structureGroup and check for vocabularies and format
									this.metadataGlobal = this.metadataGlobal.concat([[line.vocabulary, splittedLine[1]]]);
								} else {
									currMetadataObj.push(metaInfo);
								}


								// TODO: only possible for fixedPosition
								dataBlock = this.dataContent.slice(i + 1, this.dataContent.length);
								checkDataBlock.splice(i - currIdx, 1);
								currIdx++;
							} else {
								// todo: check if fixedPosition not true
							}

						}
					} else if (el.identifier) {
						// if literal !== "" -> literal exists

						// for specific metadata element (above for each line inside metadata element)

						if (el.identifier.position === "First") {
							if (el.identifier.connected) {
								let start = -1;
								// find elements connected
								let last = -1;
								for (let i = 0; i < this.dataContent.length; i++) {
									let stringEl = this.dataContent[i];
									if (stringEl.startsWith(el.identifier.literal)) {
										if (start < 0) {
											start = i;
											last = i;
										} else {
											last = i;
										}
									} else {
										if (start >= 0) {
											break;
										}
									}
								}

								if (start >= 0) {
									// let identifiedBlock = this.dataContent.splice(start, last - 1);
									this.dataContent.splice(start, last - 1);
									// let identifiedBlockCheck = checkDataBlock.splice(start - currIdx, start - currIdx + last - 1);
									let identifiedBlockCheck = checkDataBlock.splice(start - currIdx, last - 1);
									// only first string found will be replaced
									identifiedBlockCheck = identifiedBlockCheck.map(stringEl => stringEl.replace(el.identifier.literal, "").trim());
									let identifiedBlockCheckDeepClone = _.cloneDeep(identifiedBlockCheck);
									let resBlocks = this.processIdentifiedBlock(el, identifiedBlockCheckDeepClone);

									// TODO ###########################
									// adapt from resBlock to [resBlock, resBlock, resBlock, usw.]

									let newBlock = [];
									// console.log(resBlocks);
									resBlocks.forEach((resBlock, i) => {
										resBlock.forEach((block, j) => {

											let vocabs = block.line['vocabularyTerms'].concat(el['vocabularyTerms']);
											let structured = this.processValueStructureGroup(block.structureGroup, block.stringUnstructured, vocabs, "", true);
											let resEl = {
												metadata: structured,
												header: false,
												vocabularies: vocabs,
												valueUrl: ""
											}	
											let foundVocab = vocabs.find(voc => {
												let idx = structured.findIndex(elIdx => (elIdx[1] === voc.literal)); // && elIdx[0] === el.vocabularyGroup));
												return (idx >= 0 ? true : false);
											});
	
											if (foundVocab) {
												resEl.valueUrl = foundVocab.vocabularyTerm
												resEl.header = (foundVocab.data && foundVocab.data.header ? foundVocab.data.header : false);
											}

											if (i === 0) {
												newBlock.push(resEl);
											} else {
												let currObj = _.cloneDeep(newBlock[j]);
												let valUrl = "";
												if (currObj.valueUrl !== "") {
													if (resEl.valueUrl !== "") {
														if (currObj.valueUrl === resEl.valueUrl) {
															valUrl = resEl.valueUrl;
														} else {
															console.error('valueUrl not same');
														}
													} else {
														valUrl = currObj.valueUrl;
													}
												} else if (resEl.valueUrl !== "") {
													valUrl = resEl.valueUrl;
												}

												let newObj = {
													metadata: currObj.metadata.concat(structured),
													header: currObj.header || resEl.header ? true : false,
													vocabularies: currObj.vocabularies.concat(vocabs),
													valueUrl: valUrl,
												}
												newBlock[j] = newObj;
											}

										});
									});
									currMetadataObj = currMetadataObj.concat(newBlock);
								} else {
									console.error("Output might not be as expected - no lines found starting with identifier: " + el.identifier.literal);
								}

							} else {
								console.log('not implemented');
							}
						}

						// TODO - implement ignore
					}

				}

			});
		} else {
			dataBlock = this.dataContent;
		}


		this.dataBlockSubmit = _.cloneDeep(checkDataBlock);

		// console.log(this.dataBlockSubmit);
		// // console.log(this.dataContent);
		// // console.log(checkDataBlock);
		// console.log(currMetadataObj);
		// console.log(this.metadataGlobal);

		console.log('finished identifying metadata and data block.');
		this.processMetadataBlock(currMetadataObj);
	}

	private processIdentifiedBlock(cfgEl, block) {
		let resArray = [];

		// let metaInfo = {
		// 	cfgFile: cfgEl,
		// 	dataFile: lineStringBlock
		// }

		let res = [];

		if (cfgEl.lines.length > 0) {
			// TODO check for lines
			// splice identified lines and blocks
			// TODO - splice, identify, separate, (datacolumnidx?)

			for (let i = 0; i < cfgEl.lines.length; i++) {
				let line = cfgEl.lines[i];
				let lit = line.key.structureGroup[0].structure[0].type === "Literal" ? line.key.structureGroup[0].structure[0].string : false;
				if (line.key.block.multipleLines) {

					let startBlockIdx = -1;
					let endBlockIdx = -1;
					let idcsNotConnected = [];

					let identifiedStringLines = block.filter((el, j) => {
						// if (TODO: check for el.splittedBySeparator - [0].includes(structure of key) oder [1].includes(structure of value)) {
						// TODO: if (this.elIncludesStructure(...)) {
						if (lit && el.includes(line.key.structureGroup[0].structure[0].string)) {
							// console.log(el);
							// console.log(line.key.structureGroup[0].structure[0].literal);
							if (line.key.block.connected) {
								// only if i is connected
								if (startBlockIdx >= 0 && j === (endBlockIdx + 1)) {
									endBlockIdx += 1;
									return true;
								}
								if (startBlockIdx < 0) {
									startBlockIdx = j;
									endBlockIdx = j;
									return true;
								}
								return false;
							} else {
								idcsNotConnected.push(j);
								return true;
							}
						}
						return false;
					});

					if (line.key.block.connected) {
						if (line.fixedPosition) {
							let firstHalf = block.slice(0, startBlockIdx);
							// add everything before line without any detailed configuration to global
							let currRes = this.separateEachLineBySeparator(firstHalf, cfgEl, -1);
							this.metadataGlobal = this.metadataGlobal.concat(currRes.global);
							block.splice(0, endBlockIdx + 1);
						} else {
							block.splice(startBlockIdx, endBlockIdx - startBlockIdx + 1);
						}
					} else {
						// splice all elements with identified literal from block
						idcsNotConnected.forEach((idxVal, idx) => {
							block.splice(idxVal - idx, 1);
						});
					}

					let currRes = this.separateEachLineBySeparator(identifiedStringLines, cfgEl, i);
					this.dataColumnLength = currRes.metaInfo.length;
					// res = res.concat(currRes.metaInfo);
					res.push(currRes.metaInfo);
				} else {
					// TODO let identifiedStringLine = block.find(el => this.elIncludesStructure(el, ) );
					if (lit) {
						let identifiedStringLineIdx = block.findIndex(el => el.includes(line.key.structureGroup[0].structure[0].string));
						let identifiedStringLine = block.splice(identifiedStringLineIdx, 1);
						let currRes = this.separateEachLineBySeparator(identifiedStringLine, cfgEl, i);
						this.metadataGlobal = this.metadataGlobal.concat(currRes.global);


						// console.log(currRes);
						// console.log(this.metadataGlobal);
					}



					// if (cfgEl.keyvalue) {
					// 	this.metadataGlobal = this.metadataGlobal.concat(this.separateEachLineBySeparator(identifiedStringLines, cfgEl)));
					// } else {
					// 	res = res.concat(this.separateEachLineBySeparator(identifiedStringLines, cfgEl)));
					// }

					// console.log('not multipleLines in keyvalue obj');
				}
			}

			// rest separate each line by cfgEl.separator add to global info
			let currRes = this.separateEachLineBySeparator(block, cfgEl, -1);
			this.metadataGlobal = this.metadataGlobal.concat(currRes.global);
		} else {
			if (cfgEl.keyvalue) {
				//  separate each line by cfgEl.separator add to global info
				// console.log('keyvalue');
				let currRes = this.separateEachLineBySeparator(block, cfgEl, -1);
				this.metadataGlobal = this.metadataGlobal.concat(currRes.global);
			}
		}

		if (cfgEl['vocabularyTerms'] && cfgEl['vocabularyTerms'].length > 0) {
			// TODO for each string in block check for each vocabulary from cfgEl

			// resultBlock.forEach(str => {
			// 	// check for vocab in each string
			// });
			// console.log('restBlock');

		}



		console.log('end');
		console.log('###############################');

		return res;

	}

	private processMetadataBlock(metadataBlock) {
		console.log('start processing metadata block ...');

		const metadataRowTemp = {
			metadata: [],
			header: false,
			vocabularies: []
		};

		/*
		metadataBlock = [{
				cfgFile: metadata obj of config file,
				dataFile: selected line (row/col) of data file
			}]
		*/

		if (metadataBlock.length > 0 && metadataBlock[0].metadata) {

			// todo check for vocabularies 

			this.metadataRow = metadataBlock;
		} else {
			for (let i = 0; i < metadataBlock.length; i++) {
				const elCfg = metadataBlock[i].cfgFile;
				const elData = metadataBlock[i].dataFile;
	
				for (let j = 0; j < elData.length; j++) {
					if (i == 0) {
						this.metadataRow[j] = {
							header: false,
							metadata: [],
							vocabularies: []
						};
					}
	
					if (!elCfg.header) {
						// no header line
	
						// firstField
						if (elCfg && elCfg['firstField'] && elCfg['firstField'].different && elCfg['firstField'].title) {
							// TODO: for firstField - only different and not title
							// skip firstField in metadata line, if firstField is different and title
							if (j === 0) {
								continue;
							}
						}
						// vocabulary
						// check if el.vocabulary already exists and add index to existing
						// TODO: later change to merge values of same vocabulary
						// TODO: what if no vocabulary?

						const vocExists = this.metadataRow[j].metadata.find(el => (el[0] === elCfg.vocabulary || el[1] === elData[j]));
						if (vocExists) {
							if (elData[j] !== vocExists[1]) {
								console.error('error - same vocabulary with different value');
							}
							if (elCfg.vocabulary !== vocExists[0]) {
								console.error('error - same value with different vocabulary');
							}
						} else {
							this.metadataRow[j].metadata.push([elCfg.vocabulary, elData[j]]);
						}

						if (elCfg['vocabularyTerms'].length > 0) {
							
							if (this.metadataRow[j].vocabularies.length > 0) {
								// console.log('already existing');
							}
							
							// if (elCfg.phenomenon) {

							this.metadataRow[j].vocabularies = elCfg['vocabularyTerms'];

							let foundVocab = elCfg['vocabularyTerms'].find(el => el.literal === elData[j]);
							if (foundVocab) {
								this.metadataRow[j].valueUrl = foundVocab.vocabularyTerm;
							}

							// } else {
							// 	elCfg['vocabularyTerms'].forEach(voc => {
							// 		let vocIdx = this.cfgContent['vocabularyTerms'].findIndex(el => el.literal === voc.literal || el.vocabularyTerm === voc.vocabularyTerm);
							// 		if (vocIdx < 0) {
							// 			this.cfgContent['vocabularyTerms'].push(voc); 
							// 		}
							// 	});
							// 	console.log(this.cfgContent['vocabularyTerms']);
							// }

							
						}
	

						// TODO: add vocabularies ###TODO###
						// encapsulate vocabulary adding !!!
	
						// console.log(elData[j]);
						// console.log(elCfg.vocabulary);
						// console.log(this.metadataRow[j]);
	
	
	
					} else {
						// header line
	
						if (elCfg['firstField'].different) {
							// TODO
							// wenn different, dann elData.slice(1, eldData.length); , sonst elData wie in else
						} else {
							let vocab = [];
							if (elCfg["vocabularyTerms"]) {
								vocab = elCfg["vocabularyTerms"];
							}
							let valueStructureGroupArray = this.processValueStructureGroup(elCfg.value.structureGroup, elData[j], vocab, elCfg.vocabulary, true);
							let foundVocab = vocab.find(el => {
								let idx = valueStructureGroupArray.findIndex(elIdx => (elIdx[1] === el.literal)); // && elIdx[0] === el.vocabularyGroup));
								return (idx >= 0 ? true : false);
							});
	
	
							valueStructureGroupArray.forEach(val => {

								const vocExists = this.metadataRow[j].metadata.find(el => (el[0] === val[0] || el[1] === val[1]));
								if (vocExists) {
									if (val[1] !== vocExists[1]) {
										console.error('error - same vocabulary with different value');
									}
									if (val[0] !== vocExists[0]) {
										console.error('error - same value with different vocabulary');
									}
								} else {
									this.metadataRow[j].metadata.push(val);
								}
							});
	
							this.metadataRow[j].vocabularies = vocab;
							if (foundVocab) {
								this.metadataRow[j].header = (foundVocab.data && foundVocab.data.header ? foundVocab.data.header : false);
								this.metadataRow[j].valueUrl = foundVocab.vocabularyTerm;
							}
	
	
							// this.metadataRow[j].valueUrl);
							// this.metadataRow[j].vocabularies.push(this.metadataRow[j].metadata[vocExists]);
	
							// TODO: add data: classification
							// TODO: add data: category
						}
					}
				}
			}
		}


		// let infoMetadataHeaderLine = 'TODO: not implemented';

		console.log('finished processing metadata block.');
		this.processDataBlock();
	}

	private processDataBlock() {
		console.log('start processing data block ...');

		let lineString;

		for (let i = 0; i < this.cfgContent.data.length; i++) {
			let el = this.cfgContent.data[i];

			if (el.fixedPosition) {
				if (el.line === "Row") { }


				if (el.line === "Column") {
					el.lines.forEach((line, i) => {
						if (line.fixedPosition) {
							// if (line.header) {
							// 	if (!this.metadataRow[i]) {
							// 		this.metadataRow[i] = [];
							// 	}
							// 	this.metadataRow[i].header = true;
							// 	this.metadataRow[i].valueUrl = line.vocabulary;
							// 	if (!this.metadataRow[i].metadata) {
							// 		this.metadataRow[i].metadata = [];
							// 	}

							// 	// TODO: metadataRow[i].metadata ???
							// } else {
							// AirmarWS200 version 03 - each column with column header

							let firstField = line["firstField"];

							if (firstField && firstField.different) {
								if (firstField.title) {
									if (firstField.titleScope === "Row") {
										console.log('not implemented');
									}
									if (firstField.titleScope === "Column") {

										// create first line as lineString and remove from datablock
										// if (i === 0) {
										let rowString = this.dataBlockSubmit.slice(0, 1);
										lineString = rowString[0].split(el.separator !== "" ? el.separator : this.dataSeparator);
										if (i === el.lines.length - 1) {
											this.dataBlockSubmit.splice(0, 1);
										}
										// this.dataBlockSubmit.splice(0, 1);
										// }

										let dataString = lineString[i];
										let valueStructureGroupArray = this.processValueStructureGroup(firstField.structureGroup, dataString, line["vocabularyTerms"], line.vocabulary, false);

										this.metadataRow[i] = {
											header: line.header,
											metadata: valueStructureGroupArray,
											valueUrl: line.vocabulary,
											vocabularies: []
										}
										// TODO: url: line.vocabulary  - the valueStructureGroupArray should use the line.vocabulary for values and otherwise to compare with vocabulary-urls

										// console.log(dataString);
										// console.log(valueStructureGroupArray);


										// this.metadataRow[i] = {

										// }

									}
								}
							} else {
								this.metadataRow[i] = {
									header: line.header,
									metadata: [],
									valueUrl: line.vocabulary,
									vocabularies: []
								}
							}
						} else {
							// TODO: no fixed position - use identifier or line.vocabulary to search for column inside this.metadataRow
						}
					});
				}

			} else {
				// TODO: no fixed position
			}
		}


		// console.log(this.metadataRow);
		// console.log(this.dataBlockSubmit);
		// console.log(this.cfgContent.data);
		// console.log(this.metadataColumn);


		// let rowsHeaderTrue = this.metadataRow.filter(el => el.header);
		// let rowsHeaderFalse = this.metadataRow.filter(el => !el.header);
		// console.log(rowsHeaderTrue);
		// console.log(rowsHeaderFalse);



		console.log('finished processing data block.');

		this.submitNumbersReady = true;

	}














	public submitNumbers() {
		console.log('start submit numbers ...');

		// use dataSeparator to split lines of data block
		let dataSplitted = this.dataBlockSubmit.map(line => line.split(this.dataSeparator));

		if (this.dataColumnLength >= 0 && this.dataBlockSubmit.length !== this.dataColumnLength) {
			dataSplitted = this.dataBlockSubmit.map(line => line.split(this.dataSeparator).filter(el => el !== ""));
		}

		// this.dataBlockSubmit = dataSplitted;

		let metadatRowLocal = _.cloneDeep(this.metadataRow);


		// console.log(this.metadataRow);
		// console.log(dataSplitted);

		// console.log(this.numberRow);
		// console.log(this.numberColumn);

		let rowsHeaderTrue = metadatRowLocal.filter(el => el.header);
		// let rowsHeaderFalse = this.metadataRow.filter(el => !el.header);

		let resultArray = [];
		if (rowsHeaderTrue.length > 0) {
			
			// console.log(' ################### rowsHeaderTrue.length > 0');

			// for field values
			let url = metadatRowLocal[this.numberColumn + rowsHeaderTrue.length].valueUrl;
			// resultArray.push([url ? url : "selected value", this.dataBlockSubmit[this.numberRow][this.numberColumn + rowsHeaderTrue.length]]);
			if (url) {
				let selectedValUrlIdx = metadatRowLocal[this.numberColumn + rowsHeaderTrue.length].metadata.findIndex(metadataEL => {
					let vocabularyEl = metadatRowLocal[this.numberColumn + rowsHeaderTrue.length].vocabularies.find(vocabulariesEl => vocabulariesEl.vocabularyTerm === url);
					if (vocabularyEl) {
						return metadataEL[0] === vocabularyEl.vocabulary;
					} else {
						return false;
					}
				});

				if (selectedValUrlIdx >= 0 && this.selectedValue) {
					// set selected value and selected valueurl
					resultArray.push([url, dataSplitted[this.numberRow][this.numberColumn + rowsHeaderTrue.length]]);
					resultArray.push([metadatRowLocal[this.numberColumn + rowsHeaderTrue.length].metadata[selectedValUrlIdx][0], url]);
	
					metadatRowLocal[this.numberColumn + rowsHeaderTrue.length].metadata.splice(selectedValUrlIdx, 1);
				} else {
					resultArray.push(["selected value", dataSplitted[this.numberRow][this.numberColumn + rowsHeaderTrue.length]]);
					resultArray.push(["selected value url", url]);
				}

			} else {
				// alternatively only set selected value
				resultArray.push(["selected value", dataSplitted[this.numberRow][this.numberColumn + rowsHeaderTrue.length]]);
			}

			// add metadata
			resultArray = resultArray.concat(metadatRowLocal[this.numberColumn + rowsHeaderTrue.length].metadata);
			// add value

			let adds = [];
			// add column header values (e.g. timestamp / date)
			metadatRowLocal.forEach((row, i) => {
				if (row.header) {
					if (row.valueUrl) {
						adds.push([row.valueUrl, dataSplitted[this.numberRow][i]]);
					} else {
						let foundVocab = row.vocabularies.find(el => {
							let idx = row.metadata.findIndex(elIdx => (elIdx[1] === el.literal && elIdx[0] === el.vocabulary));
							return (idx >= 0 ? true : false);
						});
						adds.push([(foundVocab && foundVocab.vocabularyTerm ? foundVocab.vocabularyTerm : "header"), dataSplitted[this.numberRow][i]]);
					}
				}
			});
			resultArray = resultArray.concat(adds);

		} else {
			// for row values

			// console.log(' ################### row values');

			// console.log(metadatRowLocal);
			// console.log(dataSplitted);
			// console.log(this.numberRow);

			// for (let i = 0; i < dataSplitted[this.numberRow].length; i++) {
			for (let i = 0; i < metadatRowLocal.length; i++) {
				let fieldVal = dataSplitted[this.numberRow][i];
				let fieldValueArray = [];

				let url = metadatRowLocal[i].valueUrl;
				// fieldValueArray.push([url ? url : "val", fieldVal]);
				fieldValueArray.push(["selected value", fieldVal]);
				if (url) {
					resultArray.push(["selected value url", url]);
				}

				// add metadata
				fieldValueArray = fieldValueArray.concat(metadatRowLocal[i].metadata);
				// add value

				// let adds = [];
				// add column header values (e.g. timestamp / date)
				// metadatRowLocal.forEach((row, i) => {
				// 	if (row.header) {
				// 		if (row.valueUrl) {
				// 			adds.push([row.valueUrl, fieldVal]);
				// 		} else {
				// 			let foundVocab = row.vocabularies.find(el => {
				// 				let idx = row.metadata.findIndex(elIdx => (elIdx[1] === el.literal && elIdx[0] === el.vocabularyGroup));
				// 				return (idx >= 0 ? true : false);
				// 			});
				// 			adds.push([(foundVocab && foundVocab.vocabulary ? foundVocab.vocabulary : "header"), fieldVal]);
				// 		}
				// 	}
				// });
				// fieldValueArray = fieldValueArray.concat(adds);
				resultArray.push(fieldValueArray);
			}
		}

		this.cfgContent["vocabularyTerms"].forEach(voc => {
			let foundElIdx = resultArray.findIndex(el => voc.literal === el[1]);
			if (foundElIdx >= 0) {
				if (voc.literal === resultArray[foundElIdx][1] && voc.vocabulary === resultArray[foundElIdx][0]) {
					resultArray[foundElIdx][1] = voc.vocabularyTerm;
				}
			}
		});

		this.cfgContent["category"].forEach(cat => {
			resultArray = resultArray.map(el => {
				if (cat.literal === el[1]) {
					if (cat.vocabularyTerm && cat.vocabularyTerm !== "") {
						return [el[0], cat.vocabularyTerm];
					} else {
						return [el[0], cat.content];
					}
				} else {
					return el;
				}
			});
		});

		this.cfgContent["category"].forEach(cat => {
			this.metadataGlobal = this.metadataGlobal.map(el => {
				if (cat.literal === el[1]) {
					if (cat.vocabularyTerm && cat.vocabularyTerm !== "") {
						return [el[0], cat.vocabularyTerm];
					} else {
						return [el[0], cat.content];
					}
				} else {
					return el;
				}
			});
		});

		let result;
		if (this.metadataGlobal && this.metadataGlobal.length > 0) {
			if (this.filename.length > 0) {
				result = {
					filename: this.filename,
					column: resultArray,
					global: this.metadataGlobal
				};
			} else {
				result = {
					column: resultArray,
					global: this.metadataGlobal
				};
			}
		} else {
			if (this.filename.length > 0) {
				result = {
					filename: this.filename,
					column: resultArray
				};
			} else {
				result = {
					column: resultArray
				};
			}
		}

		console.log(result);
		console.log('#######');

		// adapt result output
		let res = JSON.stringify(result);
		let splitBracket = res.split('[').join('* [');
		let splitcolumn = splitBracket.split('],"column"').join('*],"column"');
		let splitGlobal = splitcolumn.split('],"global"').join('*],"global"');
		let newres = splitGlobal.split('*');
		this.outputArray = null;
		this.outputArray = newres;



		// console.log(dataBlock);
		// console.log(this.cfgContent.data);
		// console.log(this.metadataColumn);
		// let rowsHeaderTrue = metadatRowLocal.filter(el => el.header);
		// let rowsHeaderFalse = metadatRowLocal.filter(el => !el.header);
		// console.log(rowsHeaderTrue);
		// console.log(rowsHeaderFalse);

		console.log('finished submit numbers.');
	}



















	/*
		1. find literal
		2. check if literal first - dann last elementin structure
		3. if literal exists in string => split data, split structureGroup
			falls literal nicht exists => remove structure from structureGroup und neustart
		4. weiter mit gleicher structure
		5. recursive mit neuem Teil der structureGroup
		6. check if vocabs exist and compare with vocabs
	*/

	// sg = structureGroups - data = line of data values (splitted)
	// vocabRelatedToMetadata = true für metadata, false für data
	// da metadata vocab bezug zu metadata-line, bei data bezug zu values
	private processValueStructureGroup(sg, data, vocabularies, vocabulary, vocabRelatedToMetadata) {
		if (sg.length < 1) {
			// TODO: handle if no vocabulary given (use example when structureGroup = [], but firstField  is true)
			return [[vocabulary, data]];
		} else {
			this.vocabularyMain = ((vocabulary !== "" && vocabRelatedToMetadata) ? vocabulary : false);
			// if (!vocabRelatedToMetadata) {
			// 	this.vocabularyMain = false;
			// }

			let structureGroupsInput = _.cloneDeep(sg);
			let vocab = _.cloneDeep(vocabularies);

			const val = this.solveStructureGroups(structureGroupsInput, data, [], vocab);
			return val;
		}
	}

	private processFileNameStructureGroup(sg, data, vocabularies, vocabulary, vocabRelatedToMetadata) {
		
		let structureGroupsInput = _.cloneDeep(sg);
		let vocab = _.cloneDeep(vocabularies);

		const val = this.solveStructureGroups(structureGroupsInput, data, [], vocab);
		return val;
	}

	/**
	 * 
	 * @param structureGroupsInput {structureGroup}
	 * @param dataElementInput {string}
	 * @param res {array} result array
	 */
	private solveStructureGroups(structureGroupsInput, dataElementInput, res, vocabularies) {

		if (dataElementInput === "") {
			return res;
		}

		if (structureGroupsInput.length === 1 && structureGroupsInput[0].structure.length === 1) {
			// only one structure element exists - take rest of dataEl and put together with structure element

			if (structureGroupsInput[0].structure[0].type === "Vocabulary") {
				res.push([structureGroupsInput[0].structure[0].string, dataElementInput]);
			} else {
				res.push([this.vocabularyMain, dataElementInput]);
			}
			// res.push([this.vocabularyMain ? this.vocabularyMain : structureGroupsInput[0].structure[0].vocabulary, dataElementInput]);

			// console.log("00 one string one structure");
			return res;
		} else {

			let literalIdxStructure = -1;
			// check if literal anywhere in structuregroup
			let literalIdxGroup = structureGroupsInput.findIndex(sgEl => {
				literalIdxStructure = sgEl.structure.findIndex(structureEl => structureEl.type === "Literal");
				return (literalIdxStructure >= 0 ? true : false);
			});

			if (literalIdxGroup >= 0) {
				let literalObjStructure = structureGroupsInput[literalIdxGroup].structure;

				if (literalObjStructure[literalIdxStructure].type === "Literal") {
					if (dataElementInput.includes(literalObjStructure[literalIdxStructure].string)) {
						let splitRes = dataElementInput.split(literalObjStructure[literalIdxStructure].string);

						let stringFront = splitRes[0].trim();
						let stringBack = splitRes[1].trim();

						// slice structure obj with literal from structureGroup
						let structureFront = structureGroupsInput[literalIdxGroup].structure.slice(0, literalIdxStructure);
						let structureBack = structureGroupsInput[literalIdxGroup].structure.slice(literalIdxStructure);
						structureBack.splice(0, 1);

						let structureGroupFront = _.cloneDeep(structureGroupsInput);
						let structureGroupBack = _.cloneDeep(structureGroupsInput);

						if (literalIdxGroup < 1) {
							// front without previously choosen literal
							structureGroupFront[literalIdxGroup].structure = structureFront;
							// back with previously choosen literal
							structureGroupBack[literalIdxGroup].structure = structureBack;

							let resFront = this.solveStructureGroups(structureGroupFront, stringFront, res, vocabularies);
							let resBack = this.solveStructureGroups(structureGroupBack, stringBack, res, vocabularies);
						} else {
							// front without previously choosen literal
							if (structureFront.length > 0) {
								// cut structure where literal was found, if structure front still has vocabulary
								structureGroupFront = structureGroupsInput.slice(0, literalIdxGroup + 1);
								structureGroupFront[literalIdxGroup].structure = structureFront;
							} else {
								// cut group from structure obj where literal was found
								structureGroupFront = structureGroupsInput.slice(0, literalIdxGroup);
							}
							// back with previously choosen literal
							structureGroupBack = structureGroupsInput.slice(literalIdxGroup);
							structureGroupBack[0].structure = structureBack;

							let resFront = this.solveStructureGroups(structureGroupFront, stringFront, res, vocabularies);
							let resBack = this.solveStructureGroups(structureGroupBack, stringBack, res, vocabularies);
						}

						// console.log(res);
						// console.log('01 splitting');
						return res;
					} else {
						// because the literal does not exist, structure element will be cut from structureGroups
						structureGroupsInput.splice(literalIdxGroup, 1);
						let resNew = this.solveStructureGroups(structureGroupsInput, dataElementInput.trim(), res, vocabularies);

						// console.log('02 literal does not exist');
						return res;
					}
				} else {
					console.log('should not be matched');
					return res;
				}
			} else {
				// no literals in any object
				// use vocabularies

				for (let i = 0; i < vocabularies.length; i++) {
					const vocab = vocabularies[i];
					if (dataElementInput.includes(vocab.literal)) {
						// parse string

						/*
						string = vocab.literal
						dataElemntInput
						vocabularyGroup === structureGroupsInput[???].structure[???].vocabulary
						vocabulary -> new vocabulary
						vocabularyGroup -> new vocabulary 2
						*/
						let vocabularyGroup = vocab.vocabulary; // renamed to vocabulary and not vocabularyGroup
						// let vocabularyGroup = this.vocabularyMain ? this.vocabularyMain : vocab.vocabularyGroup; // use vocabulary main and not vocabulary of structure

						let idxVocab = dataElementInput.indexOf(vocab.literal);
						// stringFront - stringMatch - stringBack
						let stringFront = dataElementInput.slice(0, idxVocab).trim();
						let stringMatch = dataElementInput.slice(idxVocab);
						let stringBack = stringMatch.replace(vocab.literal, '').trim();
						stringMatch = stringMatch.replace(stringBack, '').trim();

						let structureGroupFront = _.cloneDeep(structureGroupsInput);
						let structureGroupMatch = _.cloneDeep(structureGroupsInput);
						let structureGroupBack = _.cloneDeep(structureGroupsInput);

						let structureMatchIdx = -1;
						// check if literal anywhere in structuregroup
						let structureGroupMatchIdx = structureGroupsInput.findIndex(sgEl => {
							structureMatchIdx = sgEl.structure.findIndex(structureEl => structureEl.type === "Vocabulary" && structureEl.string === vocabularyGroup);
							return (structureMatchIdx >= 0 ? true : false);
						});

						// structureGroupsInput[structureGroupMatchIdx].structure[structureMatchIdx];
						// slice structureGroup and divide in 3 parts
						if (stringFront !== "") {
							if (structureGroupFront[structureGroupMatchIdx].structure.slice(0, structureMatchIdx).length > 0) {
								structureGroupFront = structureGroupFront.slice(0, structureGroupMatchIdx + 1);
								structureGroupFront[structureGroupMatchIdx].structure = structureGroupFront[structureGroupMatchIdx].structure.slice(0, structureMatchIdx);
							} else {
								structureGroupFront = structureGroupFront.slice(0, structureGroupMatchIdx);
							}
							let resFront = this.solveStructureGroups(structureGroupFront, stringFront, res, vocabularies);
						}

						structureGroupMatch = structureGroupMatch.splice(structureGroupMatchIdx, 1);
						let temp = _.cloneDeep(structureGroupMatch[0].structure);
						structureGroupMatch[0].structure = temp.splice(structureMatchIdx, 1);

						let resMatch = this.solveStructureGroups(structureGroupMatch, stringMatch, res, vocabularies);

						if (stringBack !== "") {
							if (structureGroupBack[structureGroupMatchIdx].structure.slice(structureMatchIdx + 1).length > 0) {
								structureGroupBack = structureGroupBack.slice(structureGroupMatchIdx);
								structureGroupBack[0].structure = structureGroupBack[structureGroupMatchIdx].structure.slice(structureMatchIdx + 1);
							} else {
								structureGroupBack = structureGroupBack.slice(structureGroupMatchIdx + 1);
							}
							let resBack = this.solveStructureGroups(structureGroupBack, stringBack, res, vocabularies);
						}
					} else {
						continue;
					}
				}
				return res;
			}
		}
		// console.log('end function');
		// console.log(res);
		// return res;
	}

	// private spliceIdentifySeparate() {
	// 	console.log('analyse block by line and splice');
	// 	/*
	// 	analyse block by line
	// 	splice block
	// 	*/
	// }

	private elIncludesStructure(line: string, structureGroups) {
		// console.log(line);
		return true;
	}


	private separateEachLineBySeparator(block, cfgEl, line: number) {
		// console.log('separate each line by separator');
		// console.log(block);
		// console.log(cfgEl);
		// TODO: use vocabularies after splitting/before splitting 
		let res = [];
		let dataColumnIndex = [];

		if (line >= 0) {
			// console.log('line');

			if (cfgEl.keyvalue) {
				block.forEach(element => {
					let sep = (cfgEl.lines[line].separator && cfgEl.lines[line].separator !== "") ? cfgEl.lines[line].separator : cfgEl.separator;
					// take first part and last part - but split at the first occurance of the separator
					let splitted = [element.split(sep)[0], element.substring(element.indexOf(sep)+1)].map(val => val.trim());
					// let structuredKey = this.processValueStructureGroup(cfgEl.lines[line].key.structureGroup, splitted[0], cfgEl.lines[line]['vocabularyTerms'], cfgEl.vocabulary, true);
					let structuredKey;
					if (cfgEl.lines[line].key.structureGroup.find(sgEl => sgEl.structure.find(strEl => strEl.link && strEl.link.includes("Column")))) {
						structuredKey = this.processValueStructureGroupKey(cfgEl.lines[line].key.structureGroup, splitted[0], cfgEl.lines[line]['vocabularyTerms'], cfgEl.vocabulary, true);
					} else {
						structuredKey = this.processValueStructureGroupKey(cfgEl.lines[line].key.structureGroup, splitted[0], cfgEl.lines[line]['vocabularyTerms'], cfgEl.vocabulary, false);
						if (structuredKey[0]) {
							// console.log('undefined');
						} else {
							// console.log('not undefined');
						}
					}
	
					let structuredValue = this.processValueStructureGroup(cfgEl.lines[line].value.structureGroup, splitted[1], cfgEl.lines[line]['vocabularyTerms'], "", true);

					let metaInfo = {
						structureGroup: cfgEl.lines[line].value.structureGroup,
						stringUnstructured: splitted[1],
						line: cfgEl.lines[line]
					}
					if (structuredKey[0][0] === "Column") {
						dataColumnIndex[Number(structuredKey[0][1])] = metaInfo;
					} else {
						res = res.concat(structuredValue);
					}

				});
			} else {
				console.log('not imlpemented');
			}
		} else {
			if (cfgEl.keyvalue) {
				// global metadata
				// console.log('keyvalue');

				block.forEach(element => {
					// let splitted = element.split(cfgEl.separator).map(val => val.trim());
					let sep = cfgEl.separator;
					// take first part and last part - but split at the first occurance of the separator
					let splitted = [element.split(sep)[0], element.substring(element.indexOf(sep)+1)].map(val => val.trim());
					let el = cfgEl['vocabularyTerms'].find(el => el.literal === splitted[0]);
					// todo also check for classification/category/format, etc.
					let structuredValue = [(el ? el.vocabulary : splitted[0]), splitted[1]];
					res = res.concat([structuredValue]);
				});

			} else {
				console.log('no keyvalue - not implemented');
				// probably not happening, in case metadata profile changes, that multipleLines by identifier can be existing for no keyvalue metadata obj
			}
		}


		// todo: for each line
		// let metaInfo = {
		// 	cfgFile: cfgEl,
		// 	dataFile: currRes
		// }



		// block.forEach(line => {
		// 	let lineSplitted = line.split(cfgEl.separator);
		// 	let lineTrimmed = lineSplitted.map(val => val.trim());
		// 	res.push(lineTrimmed);
		// });


		return {
			global: res,
			metaInfo: dataColumnIndex
		};
	}

	// iteration => e.g. dataColumnIndex
	private processValueStructureGroupKey(sg, data, vocabularies, vocabulary, iteration) {
		// TODO check for structure
		// TODO check for vocabularies

		// TODO: check if global or with e.g. datacolumnindx ? --> identifiedStringLines

		this.vocabularyMain = vocabulary;

		let res = this.solveStructureGroupsKey(sg, data, [], vocabularies, iteration);
		return res;
	}
















	private solveStructureGroupsKey(structureGroupsInput, dataElementInput, res, vocabularies, iteration?) {

		if (dataElementInput === "") {
			return res;
		}

		if (structureGroupsInput.length === 1 && structureGroupsInput[0].structure.length === 1) {
			// only one structure element exists - take rest of dataEl and put together with structure element

			if (structureGroupsInput[0].structure[0].link) {
				res.push([structureGroupsInput[0].structure[0].link, dataElementInput]);
			} else {
				if (structureGroupsInput[0].structure[0].vocabulary) {
					res.push([structureGroupsInput[0].structure[0].vocabulary, dataElementInput]);
				} else {
					res.push([this.vocabularyMain, dataElementInput]);
				}
			}

			// res.push([this.vocabularyMain ? this.vocabularyMain : structureGroupsInput[0].structure[0].vocabulary, dataElementInput]);

			// console.log("00 one string one structure");
			return res;
		} else {

			let literalIdxStructure = -1;
			// check if literal anywhere in structuregroup
			let literalIdxGroup = structureGroupsInput.findIndex(sgEl => {
				literalIdxStructure = sgEl.structure.findIndex(structureEl => structureEl.type === "Literal");
				return (literalIdxStructure >= 0 ? true : false);
			});

			if (literalIdxGroup >= 0) {
				let literalObjStructure = structureGroupsInput[literalIdxGroup].structure;

				if (literalObjStructure[literalIdxStructure].type === "Literal") {
					if (dataElementInput.includes(literalObjStructure[literalIdxStructure].string)) {
						let splitRes = dataElementInput.split(literalObjStructure[literalIdxStructure].string);

						let stringFront = splitRes[0].trim();
						let stringBack = splitRes[1].trim();

						// slice structure obj with literal from structureGroup
						let structureFront = structureGroupsInput[literalIdxGroup].structure.slice(0, literalIdxStructure);
						let structureBack = structureGroupsInput[literalIdxGroup].structure.slice(literalIdxStructure);
						structureBack.splice(0, 1);

						let structureGroupFront = _.cloneDeep(structureGroupsInput);
						let structureGroupBack = _.cloneDeep(structureGroupsInput);

						if (literalIdxGroup < 1) {
							// front without previously choosen literal
							structureGroupFront[literalIdxGroup].structure = structureFront;
							// back with previously choosen literal
							structureGroupBack[literalIdxGroup].structure = structureBack;

							let resFront = this.solveStructureGroupsKey(structureGroupFront, stringFront, res, vocabularies);
							let resBack = this.solveStructureGroupsKey(structureGroupBack, stringBack, res, vocabularies);
						} else {
							// front without previously choosen literal
							if (structureFront.length > 0) {
								// cut structure where literal was found, if structure front still has vocabulary
								structureGroupFront = structureGroupsInput.slice(0, literalIdxGroup + 1);
								structureGroupFront[literalIdxGroup].structure = structureFront;
							} else {
								// cut group from structure obj where literal was found
								structureGroupFront = structureGroupsInput.slice(0, literalIdxGroup);
							}
							// back with previously choosen literal
							structureGroupBack = structureGroupsInput.slice(literalIdxGroup);
							structureGroupBack[0].structure = structureBack;

							let resFront = this.solveStructureGroupsKey(structureGroupFront, stringFront, res, vocabularies);
							let resBack = this.solveStructureGroupsKey(structureGroupBack, stringBack, res, vocabularies);
						}

						// console.log(res);
						// console.log('01 splitting');
						return res;
					} else {
						// because the literal does not exist, structure element will be cut from structureGroups
						structureGroupsInput.splice(literalIdxGroup, 1);
						let resNew = this.solveStructureGroupsKey(structureGroupsInput, dataElementInput.trim(), res, vocabularies);

						// console.log('02 literal does not exist');
						return res;
					}
				} else {
					console.log('should not be matched');
					return res;
				}
			} else {
				// no literals in any object
				// use vocabularies

				for (let i = 0; i < vocabularies.length; i++) {
					const vocab = vocabularies[i];
					if (dataElementInput.includes(vocab.literal)) {
						// parse string

						/*
						string = vocab.literal
						dataElemntInput
						vocabularyGroup === structureGroupsInput[???].structure[???].vocabulary
						vocabulary -> new vocabulary
						vocabularyGroup -> new vocabulary 2
						*/
						let vocabularyGroup = vocab.vocabulary;
						// let vocabularyGroup = this.vocabularyMain ? this.vocabularyMain : vocab.vocabularyGroup; // use vocabulary main and not vocabulary of structure

						let idxVocab = dataElementInput.indexOf(vocab.literal);
						// stringFront - stringMatch - stringBack
						let stringFront = dataElementInput.slice(0, idxVocab).trim();
						let stringMatch = dataElementInput.slice(idxVocab);
						let stringBack = stringMatch.replace(vocab.literal, '').trim();
						stringMatch = stringMatch.replace(stringBack, '').trim();

						let structureGroupFront = _.cloneDeep(structureGroupsInput);
						let structureGroupMatch = _.cloneDeep(structureGroupsInput);
						let structureGroupBack = _.cloneDeep(structureGroupsInput);

						let structureMatchIdx = -1;
						// check if literal anywhere in structuregroup
						let structureGroupMatchIdx = structureGroupsInput.findIndex(sgEl => {
							structureMatchIdx = sgEl.structure.findIndex(structureEl => structureEl.type === "Vocabulary" && structureEl.string === vocabularyGroup);
							return (structureMatchIdx >= 0 ? true : false);
						});

						// structureGroupsInput[structureGroupMatchIdx].structure[structureMatchIdx];
						// slice structureGroup and divide in 3 parts
						if (stringFront !== "") {
							if (structureGroupFront[structureGroupMatchIdx].structure.slice(0, structureMatchIdx).length > 0) {
								structureGroupFront = structureGroupFront.slice(0, structureGroupMatchIdx + 1);
								structureGroupFront[structureGroupMatchIdx].structure = structureGroupFront[structureGroupMatchIdx].structure.slice(0, structureMatchIdx);
							} else {
								structureGroupFront = structureGroupFront.slice(0, structureGroupMatchIdx);
							}
							let resFront = this.solveStructureGroupsKey(structureGroupFront, stringFront, res, vocabularies);
						}

						structureGroupMatch = structureGroupMatch.splice(structureGroupMatchIdx, 1);
						let temp = _.cloneDeep(structureGroupMatch[0].structure);
						structureGroupMatch[0].structure = temp.splice(structureMatchIdx, 1);

						let resMatch = this.solveStructureGroupsKey(structureGroupMatch, stringMatch, res, vocabularies);

						if (stringBack !== "") {
							if (structureGroupBack[structureGroupMatchIdx].structure.slice(structureMatchIdx + 1).length > 0) {
								structureGroupBack = structureGroupBack.slice(structureGroupMatchIdx);
								structureGroupBack[0].structure = structureGroupBack[structureGroupMatchIdx].structure.slice(structureMatchIdx + 1);
							} else {
								structureGroupBack = structureGroupBack.slice(structureGroupMatchIdx + 1);
							}
							let resBack = this.solveStructureGroupsKey(structureGroupBack, stringBack, res, vocabularies);
						}
					} else {
						continue;
					}
				}
				return res;
			}
		}
		// console.log('end function');
		// console.log(res);
		// return res;
	}

}
