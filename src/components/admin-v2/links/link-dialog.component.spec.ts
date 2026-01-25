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
        component.config.skipEmail = true; // New field
        component.config.mainButtonText = 'Custom Login'; // New field

        component.save();

        expect(component.create.emit).toHaveBeenCalledWith(expect.objectContaining({
            code: 'test-link',
            flowConfig: expect.objectContaining({
                flowId: 'apple',
                skipEmail: true,
                mainButtonText: 'Custom Login'
            })
        }));
    });

    it('should allow full wizard navigation', () => {
        // General -> Traffic
        component.nextStep();
        expect(component.activeStep()).toBe('traffic');

        // Traffic -> Geo
        component.nextStep();
        expect(component.activeStep()).toBe('geo');

        // Geo -> Flow Config (New Step)
        component.nextStep();
        expect(component.activeStep()).toBe('flow');

        // Flow -> Branding
        component.nextStep();
        expect(component.activeStep()).toBe('branding');

        // Branding -> (Next should do nothing)
        component.nextStep();
        expect(component.activeStep()).toBe('branding');

        // Back to Flow
        component.prevStep();
        expect(component.activeStep()).toBe('flow');
    });

    it('should save flow config options correctly', () => {
        component.config.code = 'flow-test';
        component.config.requireCard = true;
        component.config.customBackgroundUrl = 'https://example.com/bg.jpg';

        jest.spyOn(component.create, 'emit');
        component.save();

        expect(component.create.emit).toHaveBeenCalledWith(expect.objectContaining({
            flowConfig: expect.objectContaining({
                requireCard: true,
                customBackgroundUrl: 'https://example.com/bg.jpg'
            })
        }));
    });
});
