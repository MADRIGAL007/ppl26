import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Impure to update on signal change
})
export class TranslatePipe implements PipeTransform {
  private ts = inject(TranslationService);

  transform(key: string, params?: any): string {
    return this.ts.translate(key, params);
  }
}
