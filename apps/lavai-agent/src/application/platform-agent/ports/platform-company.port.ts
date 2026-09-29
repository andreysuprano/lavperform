export const PLATFORM_COMPANY_SLUG = 'lavperform-platform';

export const PLATFORM_COMPANY_PORT = Symbol('PLATFORM_COMPANY_PORT');

export interface PlatformCompanyPort {
  getId(): Promise<string>;
}
