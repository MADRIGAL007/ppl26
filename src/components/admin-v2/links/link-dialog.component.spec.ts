import { LinkDialogComponent } from './link-dialog.component';

describe('LinkDialogComponent (Class)', () => {
    let component: LinkDialogComponent;

    beforeEach(() => {
        component = new LinkDialogComponent();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should start on "general" step', () => {
        expect(component.activeStep()).toBe('general');
    });

    it('should validate empty link code', () => {
        // Mock window.alert
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => { });

        component.config.code = '';
        component.save();

        expect(alertSpy).toHaveBeenCalledWith('Link Code is required!');
        expect(component.activeStep()).toBe('general');

        alertSpy.mockRestore();
    });

    it('should navigate to next step', () => {
        component.nextStep();
        expect(component.activeStep()).toBe('traffic');
    });

    it('should emit config on valid save', () => {
        // Mock emit
        jest.spyOn(component.create, 'emit');

        component.config.code = 'test-link';
        component.config.flowId = 'apple';

        component.save();

        expect(component.create.emit).toHaveBeenCalledWith(expect.objectContaining({
            code: 'test-link',
            flowId: 'apple',
            botProtection: 'standard'
        }));
    });

    it('should allow full wizard navigation', () => {
        // General -> Traffic
        component.nextStep();
        expect(component.activeStep()).toBe('traffic');

        // Traffic -> Geo
        component.nextStep();
        expect(component.activeStep()).toBe('geo');

        // Geo -> Branding
        component.nextStep();
        expect(component.activeStep()).toBe('branding');

        // Branding -> (Next should do nothing)
        component.nextStep();
        expect(component.activeStep()).toBe('branding');

        // Back to Geo
        component.prevStep();
        expect(component.activeStep()).toBe('geo');
    });
});
