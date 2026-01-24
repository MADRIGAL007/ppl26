import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableV2Component } from '../ui/data-table.component';
import { LinksService, AdminLink } from '../../../services/links.service';
import { LinkDialogComponent } from './link-dialog.component';

@Component({
    selector: 'app-admin-links-v2',
    standalone: true,
    imports: [CommonModule, DataTableV2Component, LinkDialogComponent],
    template: `
    <div class="space-y-6">
       <!-- Header -->
       <div class="flex items-center justify-between">
          <div>
             <h2 class="adm-h2 text-white">Link Management</h2>
             <p class="text-slate-400 text-sm mt-1">Create and track verification links.</p>
          </div>
          <button class="adm-btn adm-btn-primary shadow-lg shadow-blue-500/20" (click)="openCreate()">
             <span class="material-icons mr-2">add_link</span>
             Create Link
          </button>
       </div>

       <!-- Links Table -->
       <app-data-table-v2
          [title]="'Active Links'"
          [columns]="columns"
          [data]="links()"
          [actionTemplate]="actionButtons"
          [loading]="linksService.isLoading()"
          (onRefresh)="linksService.fetchLinks()">
       </app-data-table-v2>

       <!-- Row Actions Template -->
       <ng-template #actionButtons let-link>
           <button class="text-slate-400 hover:text-blue-400 p-1" (click)="copyLink(link)" title="Copy URL">
               <span class="material-icons text-sm">content_copy</span>
           </button>
           <button class="text-slate-400 hover:text-red-400 p-1" (click)="deleteLink(link)" title="Delete">
               <span class="material-icons text-sm">delete</span>
           </button>
       </ng-template>

       <!-- Create Dialog -->
       @if (showDialog()) {
           <app-link-dialog
               (close)="closeDialog()"
               (create)="handleCreate($event)">
           </app-link-dialog>
       }
    </div>
  `
})
export class LinksComponent implements OnInit {
    linksService = inject(LinksService);
    showDialog = signal(false);

    columns: { header: string; field: string; width?: string; textClass?: string; type?: 'default' | 'status' | 'time' | 'country' | 'actions'; class?: string }[] = [
        { header: 'Code', field: 'code', width: 'col-span-3', textClass: 'font-mono text-blue-400 font-bold' },
        { header: 'Flow', field: 'flowName', width: 'col-span-2' },
        { header: 'Clicks', field: 'clicks', width: 'col-span-2', textClass: 'font-mono text-slate-300' },
        { header: 'Sessions', field: 'sessions', width: 'col-span-2', textClass: 'font-mono text-slate-300' },
        { header: 'Created', field: 'createdStr', width: 'col-span-2', textClass: 'text-xs text-slate-500' },
        { header: '', field: 'actions', width: 'col-span-1', type: 'actions' }
    ];

    links = computed(() => {
        return this.linksService.links().map(l => ({
            ...l,
            flowName: (l.flow_config?.flowId || 'default').toUpperCase(),
            sessions: `${l.sessions_verified || 0} / ${l.sessions_started || 0}`,
            createdStr: new Date(l.created_at).toLocaleDateString()
        }));
    });

    ngOnInit() {
        this.linksService.fetchLinks();
    }

    openCreate() {
        this.showDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
    }

    async handleCreate(payload: any) {
        await this.linksService.createLink(payload);
        this.closeDialog();
    }

    async deleteLink(link: any) {
        await this.linksService.deleteLink(link.code);
    }

    copyLink(link: any) {
        const url = `${window.location.origin}/secure/${link.code}`;
        navigator.clipboard.writeText(url).then(() => {
            // Ideally show toast
            alert('Link copied to clipboard: ' + url);
        });
    }
}
