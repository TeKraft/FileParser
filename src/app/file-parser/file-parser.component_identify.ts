import { Component, OnInit } from '@angular/core';
import { ShareFileContentService } from '../services/share-file-content.service';

import * as moment from 'moment';

@Component({
	selector: 'app-file-parser',
	templateUrl: './file-parser.component.html',
	styleUrls: ['./file-parser.component.scss']
})
export class FileParserComponent implements OnInit {

	public numberColumn: number;
	public numberRow: number;

	private dataString;
	private cfgtring;

	private block1;
	private block2;
	private selectedRowHeader = {idx: -1, exists: false};

	constructor(
		private shareFileContent: ShareFileContentService
	) { }

	ngOnInit(): void {
		// subscribe receives the value.
		this.shareFileContent.fileContentAdded.subscribe((str) => {

			/*
			0: DATA -> title: title | string: content
			1: CFG -> title: title | string: content
			*/

			// console.log(str[0]);
			// console.log(str[1]);

			this.dataString = str[0].string;
			this.cfgtring = str[1].string;
			console.log('##### start parsing #####');
			// this.startParsing();



			// identify table structure
			// identify separator symbol
			// #how
			// separate first, last, middle rows (compared to total number of rows) by '; , TAB'
			// compare quantity of separations
			// (wissenschaftlicher Belege für Vorgehen ?)
			// remove empty / short rows
			// #how
			// handle new paragraphs as new data, if first steps (step identify table structure) work - otherwise append
			// identify metadata (block 1) and data (block 2) related to measurement
			// #how
			// compare rows based on type and format (see format)
			// check if first column can be parsed to date/time/datetime object
			// identify row header of data (block 2)
			// e.g. one Date-time for each measurement in one row or one measurement each row (e.g. index)
			// => info for header of metadata
			// #how
			// check if datetime object exists by format
			// identify header of metadata (block 1)
			// split from metadata using row-header of data
			// #how
			// use datetime object in data (block 2) if exist
			// identify values for metadata profile
			// Block 1 - metadata
			// check header value from vocabularies
			// (e.g. ort, location, lat, longitude, parameter)
			// #how
			// Block 1 - header
			// use vocabularies to compare for semantic
			// each value can consist of various information
			// e.g. single value vs. location + parameter + unit
			// Block 2 - header
			// header = Date-time object?
			// parse for each measurement in row
			// otherwise:
			// parse each row as measurement

		});
	}

	public startParsing() {
		this.identifyTableStructure();
		this.identifyDataValues();

		console.log('##### end parsing #####');
	}

	private identifyTableStructure() {
		this.identifyRowBreaks();
	}

	private identifyDataValues() {
		this.identifyValuesMetadata();
	}

	private identifyRowBreaks() {
		const tsRows = this.dataString.split('\n');

		// TODO: find best position for this function in process
		this.clearValuesRows(tsRows);
	}

	private clearValuesRows(tsRows) {
		// TODO: trim values and rows

		// // Notlösung: - Probleme mit frequency - nimmt nicht ; sondern , obwohl ; genommen werden müsste
		// let tsRowsTrimmed = [];
		// if (tsRows[0].includes('"')) {
		// 	tsRows.forEach(row => {
		// 		tsRowsTrimmed.push(row.replaceAll('"', ''));
		// 	});

		// 	this.identifySeparatorSymbol(tsRowsTrimmed);
		// } else {
		this.identifySeparatorSymbol(tsRows);
		// }

	}

	private identifySeparatorSymbol(tsRows) {
		let separators = [
			{
				symbol: ';',
				lengths: [],
				columns: [],
				freq: { num: 0, freq: 0 } // {num: , freq: }
			},
			{
				symbol: ',',
				lengths: [],
				columns: [],
				freq: { num: 0, freq: 0 }
			},
			{
				symbol: ' ',
				lengths: [],
				columns: [],
				freq: { num: 0, freq: 0 }
			},
			{
				symbol: '	',
				lengths: [],
				columns: [],
				freq: { num: 0, freq: 0 }
			}
		]


		tsRows.forEach(row => {
			separators.forEach(el => {
				// TODO later: check for " " between separator
				let col = row.split(el.symbol);
				el.lengths.push(col.length);
				el.columns.push(col);
			})
		});

		separators.forEach(el => {
			el.freq = this.calcModeFreq(el.lengths);
		})

		const freqHigh = separators.reduce((prev, current) => {
			if (prev.freq.num > 1 && current.freq.num > 1) {
				return (prev.freq.freq > current.freq.freq) ? prev : current;
			} else if (prev.freq.num > 1) {
				return prev;
			} else if (current.freq.num > 1) {
				return current;
			} else return;
		}); //returns object

		// console.log(freqHigh);	// # HINT: info for parser / separator symbol

		/**
		 * parameter: freqHigh
		 * outcome ==> know:
		 * 		separator symbol
		 */

		this.removeRows(freqHigh);
	}

	private removeRows(freqHigh) {
		const columns = freqHigh.columns.filter(el => el.length === freqHigh.freq.num);
		// console.log(columns);

		this.identifyBlocks(columns);
	}

	private identifyBlocks(columns) {

		// TODO: check with "Schenker Sensordaten" - need to adjust identification - not only based on amount of numbers per row and streak,
		// but more based on strings - only strings in row means no measurement  

		// identify block: data

		const blockBool = this.identifyNumberValues(columns);
		// const verticalBlock = this.identifyNumberValuesVertical(columns);
		
		// console.log(blockBool);

		// let streak = this.findStreak(blockBool, 'true');
		let diff = this.findStreakDifference(blockBool, 'true');
		
		// console.log(streak); // # HINT: info for parser / start block data
		// console.log(diff); // # HINT: info for parser / start block data

		this.block1 = columns.slice(0, diff.start);
		this.block2 = columns.slice(diff.start);

		// console.log(this.block1);
		// console.log(this.block2);

		/**
		 * parameter: streak
		 * outcome ==> know:
		 * 		start / end block 1
		 * 		start / end block 2
		 */

		this.identifyHeader();
	}

	private identifyHeader() {

		// check first value of last row of block 1
		// === timestamp, zeitstempel, date, datum, time, zeit, index etc.
		// => check following values in same row, if parsable to one of these formats / number
		// no value (e.g. "") - check row before - same procedure --> timestampt etc. and then know that this is all header metadata, but the selected row
		// => probably no data header
		// else: if no timestampt etc. : check row before - same procedure as if no value

		const dictionary = ['timestamp', 'zeitstempel', 'date', 'datum', 'time', 'zeit'];
		this.selectedRowHeader = {idx: -1, exists: false};

		for (let i = this.block1.length - 1; i >= 0; i--) {
			if (dictionary.includes(this.block1[i][0].toLowerCase())) {
				this.selectedRowHeader.idx = i;
				break;
			}
		}

		if (this.selectedRowHeader.idx >= 0) {
			const selectedRow = this.block1[this.selectedRowHeader.idx];
			for (let i = 1; i < selectedRow.length; i++) {
				if (!moment(selectedRow[i]).isValid()) {
					this.selectedRowHeader.exists = true;
					break;
				}
			}
		}

		if (this.selectedRowHeader.exists) {
			// console.log('first col = datetime');
			// console.log('row ' + this.selectedRowHeader.idx + ' could be header row'); // to check: if field in rows exists with parameter etc.
		} else {
			// console.log('no indication via header for datetime first col');

			this.selectedRowHeader.exists = true;

			for (let i = 1; i < this.block2.length; i++) {
				if (!(moment(this.block2[i][0]).isValid() || moment(this.block2[i][0], 'DD.MM.YYYY').isValid())) {
					this.selectedRowHeader.exists = false;
					break;
				}
			}

			if (this.selectedRowHeader.exists) {
				// console.log('valid, because first row has valid date');
			}

		}

		// console.log(moment('20200827T0000').isValid());	// true
		// console.log(moment('2020-08-27 00:03:00').isValid());	// true
		// console.log(moment('20.67').isValid());
		// console.log(moment('20.7').isValid());
		// console.log(moment('5.01').isValid());	// true
		// console.log(moment('5.015874').isValid());
		// console.log(moment('temperature').isValid());


		/**
		 * parameter: 
		 * outcome ==> know:
		 * 		first column =?= header data with timestamp or similar
		 * 		header data in block1 ?
		 * 		start / end header metadata in block 1
		 */

	}


	public submitNumbers() {
		// console.log(this.numberRow);
		// console.log(this.numberColumn);

		let resultArray = [];

		// console.log(this.block1);
		// console.log(this.block2);

		if (this.block1 && this.block2) {
			if (this.selectedRowHeader.exists) {
				if (this.block2[this.numberRow] && this.block2[this.numberRow][this.numberColumn]) {
					
					
					// console.log(this.selectedRowHeader);
					// TODO: later
					// 1. use selected row header as title instead of value and date
					// 2. stay with method, filter first value

					// date in first column
					resultArray.push(['value', this.block2[this.numberRow][this.numberColumn]]);
					resultArray.push(['date', this.block2[this.numberRow][0]]);

					this.block1.forEach(el => {
						resultArray.push([el[0], el[this.numberColumn]]);
					});

				} else {
					console.log('no value found for given row and column');
				}

			} else {
				// single line values

				if (this.block2[this.numberRow]) {
					this.block2[this.numberRow].forEach((el, idx) => {
						resultArray.push([this.block1[0][idx], el]);
					});
				}

			}


			console.log('result');
			console.log(resultArray);

		} else {
			console.log('no values existings - block1 and block2 missing');
		}


	}





	private identifyValuesMetadata() {


		this.identifyValuesHeaderData();
	}

	private identifyValuesHeaderData() {


		this.identifyValuesData();
	}

	private identifyValuesData() {

	}




	// helper functions

	private prepareNumber(input: string) {
		// convert , to .
		// check for other characters than , or .
		// check for different formats
		let str = input.trim();
		let res = str;
		if (str.split(',').length === 2) {
			res = str.replace(',', '.');
			return res;
		}

		return input;
	}


	private identifyNumberValues(columns) {
		// const newArray = [];
		const blockBool = [];

		for (let i = 0; i < columns.length; i++) {
			// const newRow = [];
			blockBool[i] = {
				true: 0,
				false: 0
			}
			for (let j = 0; j < columns[i].length; j++) {
				const val = columns[i][j];
				if (val !== '' && !Number.isNaN(Number(this.prepareNumber(val)))) {
					// number
					blockBool[i].true += 1;
					// newRow.push(true);
				} else {
					// string
					blockBool[i].false += 1;
					// newRow.push(false);
				}
			}
			// newArray.push(newRow);
		}
		return blockBool;
	}

	// private identifyNumberValuesVertical(columns) {
	// 	// const newArray = [];

	// 	// for (let i = 0; i < columns.length; i++) {
	// 	// 	const newRow = [];
	// 	// 	for (let j = 0; j < columns[i].length; j++) {
	// 	// 		const val = columns[i][j];
	// 	// 		if (val !== '' && !Number.isNaN(Number(this.prepareNumber(val)))) {
	// 	// 			// number
	// 	// 			newRow.push(true);
	// 	// 		} else {
	// 	// 			// string
	// 	// 			newRow.push(false);
	// 	// 		}
	// 	// 	}
	// 	// 	newArray.push(newRow);
	// 	// }

	// 	// // return newArray;

	// 	// const arr = newArray;
	// 	const newArr = [];

	// 	const arr = columns;
	// 	let currVal,
	// 		streak,
	// 		highestStreak = 0,
	// 		streakVal,
	// 		streakStartIdx;

	// 	// loop for column
	// 	for (let i=0; i<arr[0].length; i++) {
	// 		// check the value of the current entry against the last

	// 		// loop for row
	// 		for (let j=0; j<arr.length; j++) {
	// 			// for each column
	// 			const val = arr[j][i];
	// 			// console.log(val);
	// 			// console.log(j);
	// 			const valPrep = !Number.isNaN(Number(this.prepareNumber(val)));
	// 			if (val == '' || valPrep == false) {
	// 				// match
	// 				streak++;
	// 				// console.log('#');
	// 			} else {
	// 				// no match, start streak from 1
	// 				streak = 1;
	// 				// console.log('############');
	// 			}

	// 			// set current letter for next time
	// 			currVal = val;
				
	// 			// set the master streak var
	// 			if (streak > highestStreak) {
	// 				streakVal = currVal;
	// 				highestStreak = streak;
	// 				streakStartIdx = j - (streak - 1);
	// 			}
	// 		}
	// 		newArr.push({ streak: highestStreak, val: streakVal, start: streakStartIdx });
	// 		highestStreak = 0;
	// 		// streakVal = null;
	// 		// streakStartIdx = null;


	// 	}

	// 	return newArr;
	// }

	// find longest occurence of one value
	private findStreak(arr, arrIdx) {
		let currVal,
			streak,
			highestStreak = 0,
			streakVal,
			streakStartIdx;

		for (let i=0; i<arr.length; i++) {
			// check the value of the current entry against the last
			if (arr[i][arrIdx] != '' && currVal == arr[i][arrIdx]) {
				// match
				streak++;
			} else {
				// no match, start streak from 1
				streak = 1;
			}

			// set current letter for next time
			currVal = arr[i][arrIdx];

			// set the master streak var
			if (streak > highestStreak) {
				streakVal = currVal;
				highestStreak = streak;
				streakStartIdx = i - (streak - 1);
			}
		}

		return { streak: highestStreak, val: streakVal, start: streakStartIdx };
	}

	// find highest difference between rows
	private findStreakDifference(arr, arrIdx) {
		let currVal,
			currDiff = 0,
			currDiffVal,
			currDiffStartIdx;

		for (let i=0; i<arr.length; i++) {
			// check the value of the current entry against the last
			if (arr[i][arrIdx] != '' && Math.abs(currVal - arr[i][arrIdx]) >= currDiff ) {
				// match
				currDiff = Math.abs(currVal - arr[i][arrIdx]);
				currDiffVal = arr[i][arrIdx];
				currDiffStartIdx = i;
			}

			// set current letter for next time
			currVal = arr[i][arrIdx];
		}

		return { diff: currDiff, val: currDiffVal, start: currDiffStartIdx };
	}

	// calculate most often found number in array with percentage of frequency
	private calcModeFreq(arr) {
		let freq = 0, freqNum, list = [];
		arr.forEach(function (num) {
			let foundNum = list.find(function (el) { return el.num === num })
			if (foundNum) {
				foundNum.count++
				if (foundNum.count > freq) {
					freqNum = foundNum
					freq = foundNum.count
				}
			}
			else
				list.push({ num: num, count: 1 })
		});

		const res = {
			num: freqNum.num,
			freq: (freqNum.count / arr.length)
		};
		return res;
	}

	// calculate most often found number in array
	private calcMode(arr) {
		let freq = 0, freqNum, list = [];
		arr.forEach(function (num) {
			let foundNum = list.find(function (el) { return el.num === num })
			if (foundNum) {
				foundNum.count++
				if (foundNum.count > freq) {
					freqNum = foundNum
					freq = foundNum.count
				}
			}
			else
				list.push({ num: num, count: 1 })
		});
		return freqNum.num;
	}

	// private myTrim(x) {
	// 	return x.replace(/^\s+|\s+$/gm, '');
	// }

}



// format - objects:

// 	was kann man ausschließen fürs Ziel
// 	was muss man einschließen fürs Ziel

// 	date
	// formats: XX.XX.XXXX / XX.XX.XX / XXXX.XX.XX
	// separators: '. - /'
// 	time
	// formats: XX:XX / XX:XX:XX
	// separators: ':'
// 	number:
	// formats: X.X / X.XX / X.XXX / XX.X / XX.XX / XX.XXX / etc.
	// separators: '. ,'

