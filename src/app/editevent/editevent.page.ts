import { Component, OnInit } from '@angular/core';
import { IStudent, IEvent, ISimpleAlertOptions } from '../common/models';
import {
  NavController,
  NavParams,
  Platform,
  ModalController,
  AlertController,
} from '@ionic/angular';
import { handleError } from '../common/handleError';
import { CreatePage } from '../create/create.page';
import { Storage } from '@ionic/storage';
import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-editevent',
  templateUrl: './editevent.page.html',
  styleUrls: ['./editevent.page.scss'],
})
export class EditEventPage implements OnInit {
  id;
  logo;
  students: IStudent[];
  STUDENTS: IStudent[];
  studentIds: string[];
  eventName;
  startDate;
  endDate;
  hasEndDate;
  event: IEvent;
  infiniteDates: boolean;
  language;
  imgSrc;

  htmlControls = {
    toolbar: {
      title: '',
      buttons: {
        add: '',
        edit: '',
      },
    },
    picture: '',
    reset: '',
    optional: '',
    eventName: '',
    placeholder: '',
    start: '',
    hasEnd: '',
    end: '',
    run: '',
    search: '',
    studentName: '',
    add: '',
    remove: '',
    added: '',
    notAdded: '',
    delete: '',
  };

  LANGUAGE = {
    english: {
      toolbar: {
        title: 'Edit Event',
        buttons: {
          add: 'Add All',
          edit: 'Save',
        },
      },
      picture: 'Add a Picture',
      reset: 'Reset',
      optional: 'Image is not required.',
      eventName: 'Name',
      placeholder: 'Write your Event Name',
      start: 'Start Date:',
      hasEnd: 'Has End Date?',
      end: 'End Date:',
      run: 'Run Indefinitely',
      search: 'Search by ID or Name',
      studentName: 'Name: ',
      add: 'Add',
      remove: 'Remove',
      added: ' was added to events list!',
      notAdded: ` wasn't added to events list!`,
      delete: 'Delete',
    },
    spanish: {
      toolbar: {
        title: 'Editar Evento',
        buttons: {
          add: 'Añadir todos',
          edit: 'Editar',
        },
      },
      picture: 'Añadir imagen',
      reset: 'Reiniciar',
      optional: 'La imagen no es requerido.',
      eventName: 'Nombre',
      placeholder: 'Escribe un nombre para el evento',
      start: 'Inicia en:',
      hasEnd: '¿Tiene fecha final?',
      end: 'Termina en:',
      run: 'Corre indefinidamente',
      search: 'Busca por ID or nombre',
      studentName: 'Nombre: ',
      add: 'Añadir',
      remove: 'Remover',
      added: ' fue añadido al evento.',
      notAdded: ` no fue añadido al evento.`,
      delete: 'Borrar',
    },
  };

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    public platform: Platform,
    private modalCtrl: ModalController,
    private dbService: DatabaseService,
    private alertCtrl: AlertController,
    private storage: Storage,
  ) {}

  ngOnInit() {
    this.getStudents();
    this.id = this.navParams.get('id');
    this.getEventProfile(this.id);
  }

  ionViewWillEnter() {
    this.storage.get('language').then((value) => {
      if (value) {
        this.htmlControls = this.LANGUAGE[value];
        this.language = value;
      } else {
        this.language = 'english';
        this.htmlControls = this.LANGUAGE['english'];
      }
    });
  }

  addAll() {
    for (const student of this.STUDENTS) {
      this.addToEvent(student.id);
    }
  }

  async getEventProfile(id) {
    this.studentIds = [];
    try {
      this.event = await this.dbService.getEvent(id);
      this.infiniteDates = this.event.infiniteDates;
      this.logo = this.event.logo;
      this.imgSrc = this.logo;
      this.eventName = this.event.name;
      this.startDate = this.event.startDate;
      this.endDate = this.event.endDate;
      this.studentIds = this.event.members.map((member) => member.id);
    } catch (error) {
      handleError(error);
    }
  }

  resetEndDate() {
    this.endDate = '';
  }

  async editEvent(eventData) {
    try {
      if (eventData.studentIds.length < 1) {
        let opts: ISimpleAlertOptions;
        if (this.language === 'spanish') {
          opts = {
            header: 'Error',
            message: '¡Tienes que escoger por lo menos un usario de la lista!',
          };
        } else {
          opts = {
            header: 'Error',
            message: 'Have to choose at least one user from the list!',
          };
        }
        this.showSimpleAlert(opts);
        return;
      }
      if (!eventData.startDate && !eventData.infiniteDates) {
        let opts: ISimpleAlertOptions;
        if (this.language === 'spanish') {
          opts = {
            header: 'Error',
            message: 'Tienes que escoger una fecha de inicio!',
          };
        } else {
          opts = {
            header: 'Error',
            message: 'Have to choose a start date!',
          };
        }
        this.showSimpleAlert(opts);
        return;
      }
      if (!eventData.name) {
        let opts: ISimpleAlertOptions;
        if (this.language === 'spanish') {
          opts = {
            header: 'Error',
            message: '¡Tienes que escribir un nombre para el evento!',
          };
        } else {
          opts = {
            header: 'Error',
            message: 'Have to write a name for the event!',
          };
        }
        this.showSimpleAlert(opts);
        return;
      }
      if (
        eventData.name.includes('#') ||
        eventData.name.includes('/') ||
        eventData.name.includes('%')
      ) {
        let options: ISimpleAlertOptions = {
          header: '',
          message: '',
          buttons: [],
        };
        if (this.language === 'spanish') {
          options = {
            ...options,
            header: '¡Advertencia!',
            message: 'El campo de ID no puede contener "#" o "/" o "%".',
            buttons: ['Si'],
          };
        } else {
          options = {
            ...options,
            header: 'Warning!',
            message: 'The ID field can\'t contain "#" or "/" or "%"',
            buttons: ['Ok'],
          };
        }
        this.showSimpleAlert(options);
        return;
      }
      const members = eventData.studentIds.map((studentId) => {
        const member = this.event.members.find((data) => studentId === data.id);
        if (member) {
          return member;
        } else {
          return {
            id: studentId,
            attendance: false,
            absence: false,
          };
        }
      });
      this.event = {
        ...this.event,
        logo: eventData.logo,
        name: eventData.name,
        startDate: '',
        members: [...members],
        endDate: '',
        infiniteDates: this.infiniteDates,
      };
      if (!this.event.infiniteDates) {
        this.event = {
          ...this.event,
          startDate: eventData.startDate,
        };
      }
      if (eventData.endDate && !this.event.infiniteDates) {
        this.event = {
          ...this.event,
          endDate: eventData.endDate,
        };
      } else if (!eventData.hasEndDate) {
        this.resetEndDate();
      }
      if (this.language === 'spanish') {
        const alert = await this.alertCtrl.create({
          header: '¡Advertencia!',
          message: `¿Estás seguro que quieres editar el evento ${eventData.name}?`,
          buttons: [
            { text: 'No' },
            {
              text: 'Si',
              handler: () => {
                // user has clicked the alert button
                // begin the alert's dismiss transition
                try {
                  const navTransition = alert.dismiss();
                  this.dbService.updateEvent(this.event);
                  navTransition.then(() => {
                    const options = {
                      header: '¡Éxito!',
                      message: `${eventData.name} fue editado exitosamente.`,
                    };
                    this.showAdvancedAlert(options);
                  });
                } catch (error) {
                  const options = {
                    header: 'Error',
                    message:
                      'Usuario no se pudo editar. Por favor trate de nuevo.',
                  };
                  this.showAdvancedAlert(options);
                }
                return false;
              },
            },
          ],
        });
        alert.present();
      } else {
        const alert = await this.alertCtrl.create({
          header: 'Warning!',
          message: `Are you sure you want to edit ${eventData.name} event?`,
          buttons: [
            { text: 'No' },
            {
              text: 'Yes',
              handler: () => {
                // user has clicked the alert button
                // begin the alert's dismiss transition
                const navTransition = alert.dismiss();
                try {
                  this.dbService.updateEvent(this.event);
                  navTransition.then(() => {
                    const options = {
                      header: 'Success!',
                      message: `${eventData.name} was edited successfully.`,
                    };
                    this.showAdvancedAlert(options);
                  });
                } catch (error) {
                  const options = {
                    header: 'Error',
                    message: `User couldn't be edited. Please try again!`,
                  };
                  this.showAdvancedAlert(options);
                }
                return false;
              },
            },
          ],
        });
        alert.present();
      }
    } catch (error) {
      const opts: ISimpleAlertOptions = {
        header: 'Error',
        message: error,
      };
      this.showSimpleAlert(opts);
    }
  }

  async getStudents() {
    try {
      const students = await this.dbService.getAllStudents(true);
      this.students = students;
      this.STUDENTS = students;
    } catch (error) {
      this.students = [];
      this.STUDENTS = [];
    }
  }

  private initializeStudentsList() {
    this.students = [...this.STUDENTS];
  }

  search(event) {
    const query = event.target.value;
    query ? this.filterStudentsList(query) : this.initializeStudentsList();
  }

  private filterStudentsList(query: string) {
    const students = [...this.STUDENTS];
    let fullName: string;
    const newQuery = students.filter((student) => {
      fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      if (
        student.id === query ||
        student.firstName.toLowerCase().includes(query.toLowerCase()) ||
        student.lastName.toLowerCase().includes(query.toLowerCase()) ||
        fullName === query.toLowerCase()
      ) {
        return student;
      }
    });
    this.students = [...newQuery];
  }

  addToEvent(id) {
    if (this.studentIds.indexOf(id) === -1) {
      this.studentIds = [...this.studentIds, id];
    }
  }

  removeFromEvent(id) {
    const newStudentIds = [
      ...this.studentIds.slice(0, this.studentIds.indexOf(id)),
      ...this.studentIds.slice(
        this.studentIds.indexOf(id) + 1,
        this.studentIds.length
      ),
    ];
    this.studentIds = [...newStudentIds];
  }

  async addStudent() {
    const modal = await this.modalCtrl.create({
      component: CreatePage,
    });
    modal.present();
    modal.onDidDismiss().then((_) => this.getStudents());
  }

  ifOnEventList(id) {
    if (this.studentIds.indexOf(id) !== -1) {
      return true;
    }
    return false;
  }

  /**
   *
   * @param options
   * Show a message on the screen
   */
  private async showSimpleAlert(options: ISimpleAlertOptions) {
    const alert = await this.alertCtrl.create({
      header: options.header,
      message: options.message,
      buttons: options.buttons,
    });
    alert.present();
  }

  async showAdvancedAlert(options: ISimpleAlertOptions) {
    const alert = await this.alertCtrl.create({
      header: options.header,
      message: options.message,
      buttons: [
        {
          text: 'OK',
          handler: () => {
            // user has clicked the alert button
            // begin the alert's dismiss transition
            alert.dismiss().then(() => {
              if (options['event'] === 'delete') {
                this.navCtrl
                  .navigateRoot('/tabs/tabs/home/events')
                  .then(() => this.modalCtrl.dismiss());
              } else {
                this.modalCtrl.dismiss(this.id);
              }
            });
            return false;
          },
        },
      ],
    });
    alert.present();
  }

  async removeEvent() {
    if (this.language === 'spanish') {
      const alert = await this.alertCtrl.create({
        header: '¡Advertencia!',
        message: `¿Estás seguro que quieres borrar el evento ${this.eventName}?`,
        buttons: [
          { text: 'No' },
          {
            text: 'Si',
            handler: () => {
              // user has clicked the alert button
              // begin the alert's dismiss transition
              const navTransition = alert.dismiss();
              try {
                this.dbService.removeEvent(this.event);
                this.id = undefined;
                navTransition.then(() => {
                  const opts = {
                    header: '¡éxisto!',
                    message: '¡El evento se borro exitosamente!',
                    event: 'delete',
                  };
                  this.showAdvancedAlert(opts);
                });
              } catch (error) {
                const options = {
                  header: 'Error',
                  message: error,
                };
                navTransition.then(() => this.showAdvancedAlert(options));
              }
              return false;
            },
          },
        ],
      });
      alert.present();
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Warning!',
        message: `Are you sure you want to delete ${this.eventName} event?`,
        buttons: [
          { text: 'No' },
          {
            text: 'Yes',
            handler: () => {
              // user has clicked the alert button
              // begin the alert's dismiss transition
              const navTransition = alert.dismiss();
              try {
                this.dbService.removeEvent(this.event);
                this.id = undefined;
                navTransition.then(() => {
                  const opts = {
                    header: 'Success!',
                    message: 'Event was removed successfully!',
                    event: 'delete',
                  };
                  this.showAdvancedAlert(opts);
                });
              } catch (error) {
                const options = {
                  header: 'Error',
                  message: error,
                };
                navTransition.then(() => this.showAdvancedAlert(options));
              }
              return false;
            },
          },
        ],
      });
      alert.present();
    }
  }
}
