import { trigger, transition, style, query, animate, group } from '@angular/animations';

export const fadeAnimation = trigger('fadeAnimation', [
    transition('* => *', [
        query(':enter', [style({ opacity: 0 })], { optional: true }),
        query(':leave', [style({ opacity: 1 })], { optional: true }),
        group([
            query(':leave', [animate('300ms ease-out', style({ opacity: 0 }))], { optional: true }),
            query(':enter', [animate('300ms ease-out', style({ opacity: 1 }))], { optional: true })
        ])
    ])
]);

export const slideInAnimation = trigger('routeAnimations', [
    transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
            style({
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%'
            })
        ], { optional: true }),
        query(':enter', [
            style({
                opacity: 0,
                transform: 'translateX(20px) scale(0.98)'
            })
        ], { optional: true }),
        group([
            query(':leave', [
                animate('300ms ease-out', style({
                    opacity: 0,
                    transform: 'translateX(-20px) scale(0.98)'
                }))
            ], { optional: true }),
            query(':enter', [
                animate('400ms ease-out', style({
                    opacity: 1,
                    transform: 'translateX(0) scale(1)'
                }))
            ], { optional: true })
        ])
    ])
]);
