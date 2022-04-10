import { Injectable } from '@angular/core';
import { IonicStorageAdapter } from './adapter';
import * as Loki from 'lokijs';
import {
  IStudent,
  IRecord,
  IEvent,
  INote,
  IResponse,
  ICalendar,
} from 'src/app/common/models';
import { trimEvent, trimText } from 'src/app/common/format';
import { handleError } from 'src/app/common/handleError';
import { Storage } from '@ionic/storage';
import { CameraToolsService } from 'src/app/services/camera-tools.service';

/**
 * Collections use on db
 */
let studentsColl: Collection<IStudent>;
let recordsColl: Collection<IRecord>;
let eventsColl: Collection<IEvent>;
let notesColl: Collection<INote>;
/**
 * Declaration of DB
 */
let amaranthusDB: Loki;

let studentView: DynamicView<IStudent[]>;
let recordsView: DynamicView<IRecord[]>;
let notesView: DynamicView<INote[]>;
let eventsView: DynamicView<IEvent[]>;

@Injectable({
  providedIn: 'root',
})
export class AmaranthusDBProvider {
  constructor(
    private storage: Storage,
    private cameraTools: CameraToolsService
  ) {}

  async init(): Promise<Collection<IStudent>> {
    return new Promise((resolve) => {
      let lokiOptions: Partial<LokiConfigOptions> = {
        autosave: true,
        autoload: true,
        autoloadCallback: () => {
          studentsColl = amaranthusDB.getCollection<IStudent>('students');
          recordsColl = amaranthusDB.getCollection<IRecord>('records');
          eventsColl = amaranthusDB.getCollection<IEvent>('events');
          notesColl = amaranthusDB.getCollection<INote>('notes');
          if (!studentsColl) {
            studentsColl = amaranthusDB.addCollection<IStudent>('students');
          }
          if (!recordsColl) {
            recordsColl = amaranthusDB.addCollection<IRecord>('records');
          }
          if (!eventsColl) {
            eventsColl = amaranthusDB.addCollection<IEvent>('events');
          }
          if (!notesColl) {
            notesColl = amaranthusDB.addCollection<INote>('notes');
          }

          studentView = studentsColl.getDynamicView('students');
          if (!studentView) {
            studentView = studentsColl.addDynamicView(
              'students'
            ) as unknown as DynamicView<IStudent[]>;
          }
          recordsView = recordsColl.getDynamicView('records');
          if (!recordsView) {
            recordsView = recordsColl.addDynamicView(
              'records'
            ) as unknown as DynamicView<IRecord[]>;
          }
          notesView = notesColl.getDynamicView('notes');
          if (!notesView) {
            notesView = notesColl.addDynamicView(
              'notes'
            ) as unknown as DynamicView<INote[]>;
          }
          eventsView = eventsColl.getDynamicView('events');
          if (!eventsView) {
            eventsView = eventsColl.addDynamicView(
              'events'
            ) as unknown as DynamicView<IEvent[]>;
          }
          resolve(studentsColl);
        },
      };
      const ionicStorageAdapter = new IonicStorageAdapter();
      lokiOptions.adapter = ionicStorageAdapter;
      amaranthusDB = new Loki('amaranthus.db', lokiOptions);
    });
  }

  private async convertPictures(data) {
    return await this.cameraTools.readAsBlob(data);
  }

  deleteInvalidCharacters() {
    studentsColl.findAndRemove({ id: { $containsAny: '/' } });
    studentsColl.findAndRemove({ id: { $containsAny: '#' } });
    studentsColl.findAndRemove({ id: { $containsAny: '%' } });
  }

  checkIfUserExists(opts: { username: string; password }) {
    let checkUser = studentsColl.findOne({
      id: {
        $eq: opts.username,
      },
      phoneNumber: {
        $eq: opts.password,
      },
    });
    if (!checkUser) {
      const fullName = opts.username.split(' ');
      checkUser = studentsColl.findOne({
        firstName: {
          $eq: fullName[0],
        },
        lastName: {
          $eq: fullName[1],
        },
        phoneNumber: {
          $eq: opts.password,
        },
      });
    }
    if (checkUser) {
      const currentDate = new Date();
      const date: ICalendar = {
        month: currentDate.getMonth(),
        day: currentDate.getDate(),
        year: currentDate.getFullYear(),
      };
      this.addAttendance({ date: date, id: checkUser.id });
    } else {
      throw new Error('User not in database.');
    }
    return checkUser.firstName;
  }

  getNoteByDate(opts: { date: ICalendar; id: string; event: string }) {
    const results = notesColl.findOne({
      id: {
        $eq: opts.id,
      },
      month: {
        $eq: opts.date.month,
      },
      year: {
        $eq: opts.date.year,
      },
      day: {
        $eq: opts.date.day,
      },
      event: {
        $eq: opts.event,
      },
    });
    return results;
  }

  getNoteById(id: string) {
    let response: IResponse<INote> = {
      success: false,
      error: null,
      data: undefined,
    };
    const results = notesColl.findOne({
      id: id,
    });
    if (results) {
      response = {
        ...response,
        success: true,
        data: results,
      };
      return response;
    } else {
      response = {
        ...response,
        error: 'Error retrieving notes. Please try again!',
        data: null,
      };
      return response;
    }
  }

  getAllNotesById(id: string) {
    const results = notesColl
      .chain()
      .find({
        id: id,
      })
      .simplesort('day')
      .simplesort('month')
      .simplesort('year')
      .data();
    if (results) {
      return results;
    } else {
      throw new Error('Error retrieving notes. Please try again!');
    }
  }

  getNotes() {
    return notesColl.data;
  }

  insertNotes(note: INote) {
    const results: any = notesColl.findOne({
      id: {
        $eq: note.id,
      },
      month: {
        $eq: note.month,
      },
      year: {
        $eq: note.year,
      },
      day: {
        $eq: note.day,
      },
      event: note.event,
    });
    if (!results) {
      notesColl.insert(note);
    } else {
      const newNote = {
        ...results,
        ...note,
      };
      notesColl.update(newNote);
    }
  }

  studentExists(id) {
    return studentsColl.findOne({
      id: id,
    });
  }

  updateEventMembers(opts: { name: string; member: { id: any } }) {
    const results = eventsColl.findOne({
      name: opts.name,
    });
    const members = results.members.filter(
      (member) => member.id !== opts.member.id
    );
    const event = {
      ...results,
      members: members,
    };
    eventsColl.update(event);
  }

  insertEvent(event: IEvent) {
    const formattedEvent = trimEvent(event);
    const exists = eventsColl.findOne({
      name: event.name,
    });
    if (!exists) {
      eventsColl.insert(formattedEvent);
    }
  }

  updateEvent(event) {
    try {
      const results = eventsColl.get(event.$loki);
      if (results) {
        eventsColl.update(event);
      } else {
        throw new Error(`User doesn't exist on Database`);
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  removeEvent(event: IEvent) {
    try {
      const results = eventsColl.get(event['$loki']);
      eventsColl.remove(results);
      const records = recordsColl.find({
        event: results.name,
      });
      records.forEach((record) => recordsColl.remove(record));
    } catch (error) {
      throw new Error(error);
    }
  }

  getEvents(): IEvent[] {
    const results: any = eventsColl
      .chain()
      .simplesort('startDate', true)
      .data();
    return results;
  }

  getEvent(id) {
    const results = eventsColl.get(id);
    return results;
  }

  checkIfStudentExists(opts: { id: string }) {
    try {
      const results = studentsColl.findOne({
        id: {
          $eq: opts.id,
        },
      });
      if (results) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      if (!studentsColl) {
        return error;
      }
    }
  }

  insertStudentIntoDB(student: IStudent) {
    const value = this.checkIfStudentExists({ id: student.id });
    if (value === false) {
      const formattedStudent = trimText(student);
      studentsColl.insert(formattedStudent);
    } else {
      throw new Error('User already exists in the database');
    }
  }

  async insertStudent(student: IStudent) {
    if (studentsColl.data.length > 9) {
      const boughtMasterKey = await this.storage.get('boughtMasterKey');
      if (boughtMasterKey === true) {
        this.insertStudentIntoDB(student);
      } else {
        throw new Error(
          `Reached the limit of 10 persons in database. If you want to get rid of this limit please consider buying the app!`
        );
      }
    } else {
      this.insertStudentIntoDB(student);
    }
  }

  updateStudent(student: IStudent) {
    let results: any = studentsColl.findOne({
      id: {
        $eq: student.id,
      },
    });
    const formattedStudent = trimText(student);
    results = {
      ...results,
      ...formattedStudent,
    };
    studentsColl.update(results);
  }

  removeStudent(student: IStudent) {
    const students = studentsColl.findOne({
      id: {
        $eq: student.id,
      },
    });
    studentsColl.remove(students);

    const records = recordsColl.find({
      id: {
        $eq: student.id,
      },
    });
    if (records['length']) {
      records.forEach((record) => {
        recordsColl.remove(record);
      });
    }

    const notes = notesColl.find({
      id: {
        $eq: student.id,
      },
    });
    if (notes['length']) {
      notes.forEach((note) => {
        notesColl.remove(note);
      });
    }
  }

  addAbsence(opts: {
    date: ICalendar;
    id: string;
    event?: string;
  }): IResponse<null> {
    let response;
    if (opts['event']) {
      response = this.insertOrUpdateRecord({
        ...opts,
        date: {
          ...opts.date,
          month: opts.date.month + 1,
        },
        attendance: false,
        absence: true,
        event: opts.event,
      });
    } else {
      response = this.insertOrUpdateRecord({
        ...opts,
        date: {
          ...opts.date,
          month: opts.date.month + 1,
        },
        attendance: false,
        absence: true,
      });
    }
    return response;
  }

  addAttendance(opts: { date: ICalendar; id: string; event?: string }) {
    if (opts['event']) {
      this.insertOrUpdateRecord({
        ...opts,
        date: {
          ...opts.date,
          month: opts.date.month + 1,
        },
        attendance: true,
        absence: false,
        event: opts.event,
      });
    } else {
      this.insertOrUpdateRecord({
        ...opts,
        date: {
          ...opts.date,
          month: opts.date.month + 1,
        },
        attendance: true,
        absence: false,
      });
    }
  }

  insertOrUpdateRecord(opts: {
    attendance: boolean;
    absence: boolean;
    date: ICalendar;
    id: string;
    event?: string;
  }) {
    let record: IRecord = {
      id: opts.id,
      month: opts.date.month,
      year: opts.date.year,
      day: opts.date.day,
      attendance: opts.attendance,
      absence: opts.absence,
      event: '',
    };
    let results;
    if (opts['event']) {
      record = {
        ...record,
        event: opts.event,
      };
      results = recordsColl.findOne({
        id: {
          $eq: record.id,
        },
        month: {
          $eq: record.month,
        },
        year: {
          $eq: record.year,
        },
        day: {
          $eq: record.day,
        },
        event: {
          $eq: opts.event,
        },
      });
    } else if (opts.hasOwnProperty('event')) {
      results = recordsColl.findOne({
        id: {
          $eq: record.id,
        },
        month: {
          $eq: record.month,
        },
        year: {
          $eq: record.year,
        },
        day: {
          $eq: record.day,
        },
        event: {
          $eq: '',
        },
      });
    } else {
      results = recordsColl.findOne({
        id: {
          $eq: record.id,
        },
        month: {
          $eq: record.month,
        },
        year: {
          $eq: record.year,
        },
        day: {
          $eq: record.day,
        },
      });
    }
    if (results) {
      const foundRecord = {
        ...results,
        ...record,
      };
      recordsColl.update(foundRecord);
    } else {
      const newRecord = {
        ...record,
      };
      recordsColl.insert(newRecord);
    }
  }

  getStudentById(id: string): IStudent {
    const results = studentsColl.findOne({
      id: {
        $eq: id,
      },
    });
    return results;
  }

  getQueriedRecords(opts: {
    event?: string;
    query: string;
    date?: ICalendar;
  }): IRecord[] {
    switch (opts.query) {
      case 'Date':
        const temp = {
          date: opts.date,
          event: opts['event'],
        };
        return this.getAllStudentsRecords(temp);
      default:
        const date: ICalendar = {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          day: null,
        };
        let options: any = {
          date: date,
          event: '',
        };
        if (opts['event']) {
          options = {
            ...options,
            event: opts.event,
          };
        }
        try {
          return this.getAllStudentsRecords(options);
        } catch (error) {
          return error;
        }
    }
  }

  async getStudentsRecordsByDate(opts: { date: ICalendar; event?: string }) {
    const students = studentsColl.find({
      isActive: {
        $eq: true,
      },
    });
    const records: IRecord[] = students.map((student: IStudent) => {
      let studentRecord;
      let record;
      if (opts['event']) {
        record = recordsColl.findOne({
          id: {
            $eq: student.id,
          },
          year: {
            $eq: opts.date.year,
          },
          month: {
            $eq: opts.date.month,
          },
          day: {
            $eq: opts.date.day,
          },
          event: {
            $eq: opts.event,
          },
        });
      } else if (opts.hasOwnProperty('event')) {
        record = recordsColl.findOne({
          id: {
            $eq: student.id,
          },
          year: {
            $eq: opts.date.year,
          },
          month: {
            $eq: opts.date.month,
          },
          day: {
            $eq: opts.date.day,
          },
          event: {
            $eq: '',
          },
        });
      } else {
        record = recordsColl.findOne({
          id: {
            $eq: student.id,
          },
          year: {
            $eq: opts.date.year,
          },
          month: {
            $eq: opts.date.month,
          },
          day: {
            $eq: opts.date.day,
          },
        });
      }
      const noteDate = {
        ...opts.date,
        month: opts.date.month - 1,
      };
      const noteData = this.getNoteByDate({
        id: student.id,
        date: noteDate,
        event: opts.event,
      });
      if (noteData) {
        studentRecord = { notes: noteData.notes };
      } else {
        studentRecord = { notes: '' };
      }
      if (record) {
        if (student.id === record.id) {
          studentRecord = {
            ...studentRecord,
            firstName: student.firstName,
            lastName: student.lastName,
            fullName: `${student.firstName} ${student.lastName}`,
            picture: student.picture,
            attendance: record.attendance,
            absence: record.absence,
            id: student.id,
          };
          return studentRecord;
        }
      } else {
        studentRecord = {
          ...studentRecord,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: `${student.firstName} ${student.lastName}`,
          picture: student.picture,
          attendance: false,
          absence: false,
          id: student.id,
        };
        return studentRecord;
      }
    });
    return records;
  }

  getAllStudentsRecords(opts: { event?: string; date: ICalendar }): IRecord[] {
    let attendance;
    let absence;
    try {
      const students = studentsColl.find({
        isActive: {
          $eq: true,
        },
      });
      let data = [];
      students.map((student: IStudent) => {
        attendance = 0;
        absence = 0;
        let records;
        if (!opts.date.day) {
          if (opts['event']) {
            records = recordsColl.find({
              id: {
                $eq: student.id,
              },
              year: {
                $eq: opts.date.year,
              },
              month: {
                $eq: opts.date.month,
              },
              event: {
                $eq: opts.event,
              },
            });
          } else if (opts.hasOwnProperty('event')) {
            records = recordsColl.find({
              id: {
                $eq: student.id,
              },
              year: {
                $eq: opts.date.year,
              },
              month: {
                $eq: opts.date.month,
              },
              event: {
                $eq: '',
              },
            });
          } else {
            records = recordsColl.find({
              id: {
                $eq: student.id,
              },
              year: {
                $eq: opts.date.year,
              },
              month: {
                $eq: opts.date.month,
              },
            });
          }
        } else {
          if (opts['event']) {
            records = recordsColl.find({
              id: {
                $eq: student.id,
              },
              year: {
                $eq: opts.date.year,
              },
              month: {
                $eq: opts.date.month,
              },
              day: {
                $eq: opts.date.day,
              },
              event: {
                $eq: opts.event,
              },
            });
          } else if (opts.hasOwnProperty('event')) {
            records = recordsColl.find({
              id: {
                $eq: student.id,
              },
              year: {
                $eq: opts.date.year,
              },
              month: {
                $eq: opts.date.month,
              },
              day: {
                $eq: opts.date.day,
              },
              event: {
                $eq: '',
              },
            });
          } else {
            records = recordsColl.find({
              id: {
                $eq: student.id,
              },
              year: {
                $eq: opts.date.year,
              },
              month: {
                $eq: opts.date.month,
              },
              day: {
                $eq: opts.date.day,
              },
            });
          }
        }
        if (records) {
          records.map((record: IRecord) => {
            if (opts.date.day) {
              if (record.attendance === true) {
                attendance = 'x';
                absence = 'o';
              }
              if (record.absence === true) {
                absence = 'x';
                attendance = 'o';
              }
            } else {
              if (record.attendance === true) {
                attendance++;
              }
              if (record.absence === true) {
                absence++;
              }
            }
          });
          let percent = null;
          if (!opts.date.day) {
            percent = 0;
          }
          if (attendance + absence !== 0) {
            percent = ((100 * attendance) / (attendance + absence)).toFixed(2);
          }
          if (percent) {
            data = [
              ...data,
              {
                id: student.id,
                fullName: `${student.firstName} ${student.lastName}`,
                attendance: attendance,
                percent: percent,
                absence: absence,
                picture: student.picture,
              },
            ];
          } else {
            data = [
              ...data,
              {
                id: student.id,
                fullName: `${student.firstName} ${student.lastName}`,
                attendance: attendance,
                absence: absence,
                picture: student.picture,
              },
            ];
          }
        }
      });
      return data;
    } catch (error) {
      handleError(error);
      throw new Error(error);
    }
  }

  getAllStudents(event?: boolean): IStudent[] {
    let students;
    if (event) {
      students = studentsColl.find({
        isActive: {
          $eq: true,
        },
      });
    } else {
      students = studentsColl.data;
    }
    return students;
  }

  getQueriedRecordsByDate(opts: { event?: string; date: ICalendar }) {
    try {
      return this.getAllStudentsRecords(opts);
    } catch (error) {
      return error;
    }
  }

  /**
   *
   * @param date
   */
  async getAllActiveStudents(date: ICalendar): Promise<(IStudent & IRecord)[]> {
    try {
      if (!studentsColl) {
        studentsColl = await this.init();
      }
      const students = studentsColl.find({
        isActive: {
          $eq: true,
        },
      }); // Do not delete!
      this.deleteInvalidCharacters();
      let record: IRecord;
      const results = students.map((student) => {
        record = {
          ...this.getQueriedRecordsByCurrentDate({
            studentId: student.id,
            year: date.year,
            day: date.day,
            month: date.month,
          }),
        };
        const noteData = this.getNoteByDate({
          id: student.id,
          event: '',
          date: {
            ...date,
            month: date.month - 1,
          },
        });
        let newStudent = {
          ...student,
        };
        if (record != null && record.id === student.id) {
          newStudent = {
            ...newStudent,
            ...record,
          };
        }
        if (noteData) {
          newStudent = {
            ...newStudent,
            notes: noteData.notes,
          };
        }
        return newStudent;
      }) as unknown as (IStudent & IRecord)[]; // got results
      return results;
    } catch (error) {
      console.log(error);
    }
  }

  getQueriedRecordsByCurrentDate(opts: {
    event?: string;
    studentId: string;
    day: number;
    year: number;
    month: number;
  }): IRecord {
    let recordQuery;
    if (opts['event']) {
      recordQuery = recordsColl.findOne({
        id: {
          $eq: opts.studentId,
        },
        year: {
          $eq: opts.year,
        },
        day: {
          $eq: opts.day,
        },
        month: {
          $eq: opts.month,
        },
        event: {
          $eq: opts.event,
        },
      });
    } else if (opts.hasOwnProperty('event')) {
      recordQuery = recordsColl.findOne({
        id: {
          $eq: opts.studentId,
        },
        year: {
          $eq: opts.year,
        },
        day: {
          $eq: opts.day,
        },
        month: {
          $eq: opts.month,
        },
        event: {
          $eq: '',
        },
      });
    } else {
      recordQuery = recordsColl.findOne({
        id: {
          $eq: opts.studentId,
        },
        year: {
          $eq: opts.year,
        },
        day: {
          $eq: opts.day,
        },
        month: {
          $eq: opts.month,
        },
      });
    }
    return recordQuery;
  }
}