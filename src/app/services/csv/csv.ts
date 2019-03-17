import { Injectable } from '@angular/core';
import { IRecord, IResponse } from 'src/app/common/models';
import { recordType } from 'src/app/common/constants';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class CSVProvider {

  constructor() { }

  async exportCSV(opts: { type: string, records: IRecord[] }): Promise<IResponse<Blob>> {
    let response: IResponse<Blob> = {
      success: false,
      error: null,
      data: undefined
    };
    try {
      const data = await this.createCSV({ type: opts.type, records: opts.records });
      response = {
        ...response,
        success: true,
        data: data
      };
      return response;
    } catch (error) {
      response = {
        ...response,
        error: error
      };
      return error;
    }
  }

  private createCSV(opts: { type: string, records: IRecord[] }): Promise<Blob> {
    let headers;
    return new Promise((resolve, reject) => {
      if (opts.type === recordType.month) {
        headers = ['Id', 'Name', 'Attendance', 'Absence', 'Attendance %'];
      }
      if (opts.type === recordType.day) {
        headers = ['Id', 'Name', 'Attendance', 'Absence'];
      }
      try {
        const studentRecords = opts.records.map((record) => {
          let temp = [];
          if (opts.type === recordType.month) {
            temp = [...[record.id, record.fullName, record.attendance, record.absence, record.percent]];
          }
          if (opts.type === recordType.day) {
            temp = [...[record.id, record.fullName, record.attendance, record.absence]];
          }
          return temp;
        });
        studentRecords.unshift(headers);
        const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(studentRecords);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'application/octet-stream' });
        resolve(blob);
      } catch (error) {
        reject('There are no students created in database!');
      }
    });
  }

  // exportCSV(tableRecords: IRecord[]): IResponse<string> {
  //   let response: IResponse<string> = {
  //     success: false,
  //     error: null,
  //     data: undefined
  //   };
  //   try {
  //     const data = this.createCSV(tableRecords);
  //     response = {
  //       ...response,
  //       success: true,
  //       data: data
  //     };
  //     return response;
  //   } catch (error) {
  //     response = {
  //       ...response,
  //       error: error
  //     };
  //     return error;
  //   }
  // }

  // private createCSV(tableRecords: IRecord[]): string {
  //   let value = 'Id|Name|Attendance|Absence|Attendance %\n';
  //   try {
  //     tableRecords.map(tableRecord => {
  //       value += `${tableRecord.id}|`;
  //       value += `${tableRecord.fullName}|`;
  //       value += `${tableRecord.attendance}|`;
  //       value += `${tableRecord.absence}|`;
  //       value += `${tableRecord.percent}\n`;
  //     });
  //     return value;
  //   } catch (error) {
  //     return 'There are no students created!';
  //   }
  // }

}
