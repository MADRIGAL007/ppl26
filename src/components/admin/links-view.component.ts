
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LinksService } from '../../services/links.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-links-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-white">Tracking Links</h2>
        <button (click)="createLink()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            <span class="material-icons text-sm">add</span>
            Create New Link
        </button>
      </div>

      <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-[#1a1a24] text-slate-400 text-xs uppercase tracking-wider">
              <th class="p-4 font-semibold">Code / URL</th>
              <th class="p-4 font-semibold">Stats</th>
              <th class="p-4 font-semibold">Created</th>
              <th class="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2e2e3a]">
            @for (link of linksService.links(); track link.code) {
              <tr class="hover:bg-[#1a1a24]/50 transition-colors">
                <td class="p-4">
                  <div class="flex flex-col">
                    <span class="text-white font-mono text-sm">{{ link.code }}</span>
                    <a [href]="getLinkUrl(link.code)" target="_blank" class="text-indigo-400 text-xs hover:underline truncate max-w-[200px]">{{ getLinkUrl(link.code) }}</a>
                  </div>
                </td>
                <td class="p-4">
                  <div class="flex gap-4 text-sm">
                    <div class="text-center">
                        <div class="text-white font-bold">{{ link.clicks }}</div>
                        <div class="text-[10px] text-slate-500">CLICKS</div>
                    </div>
                    <div class="text-center">
                        <div class="text-indigo-400 font-bold">{{ link.sessions_started }}</div>
                        <div class="text-[10px] text-slate-500">STARTED</div>
                    </div>
                    <div class="text-center">
                        <div class="text-emerald-400 font-bold">{{ link.sessions_verified }}</div>
                        <div class="text-[10px] text-slate-500">VERIFIED</div>
                    </div>
                  </div>
                </td>
                <td class="p-4">
                    <span class="text-slate-400 text-sm">{{ link.created_at | date:'short' }}</span>
                </td>
                <td class="p-4 text-right">
                  <button (click)="copyLink(link.code)" class="text-slate-400 hover:text-white mr-3">
                    <span class="material-icons text-sm">content_copy</span>
                  </button>
                  <button (click)="deleteLink(link.code)" class="text-red-500 hover:text-red-400">
                    <span class="material-icons text-sm">delete</span>
                  </button>
                </td>
              </tr>
            }
            @if (linksService.links().length === 0) {
                <tr>
                    <td colspan="4" class="p-8 text-center text-slate-500">
                        No links created yet. Click "Create New Link" to get started.
                    </td>
                </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class LinksViewComponent implements OnInit {
  linksService = inject(LinksService);

  ngOnInit() {
    this.linksService.fetchLinks();
  }

  getLinkUrl(code: string): string {
    return `${window.location.origin}/?id=${code}`;
  }

  async createLink() {
    // For now, default paypal. Future: Modal selector
    // Generate a random code for legacy creation
    const randomCode = Math.random().toString(36).substring(7);
    await this.linksService.createLink({
      code: randomCode,
      flowConfig: { flowId: 'paypal' }
    });
  }

  async deleteLink(code: string) {
    await this.linksService.deleteLink(code);
  }

  copyLink(code: string) {
    navigator.clipboard.writeText(this.getLinkUrl(code));
  }
}
