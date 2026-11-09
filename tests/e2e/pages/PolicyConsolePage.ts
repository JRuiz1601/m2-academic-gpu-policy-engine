import { expect, type Locator, type Page } from '@playwright/test';

export type Participant = 'Rebecca' | 'Mateo';
const PARTICIPANT_LABEL: Record<Participant, string> = {
  Rebecca: 'Rebecca · Profesora y operadora de laboratorio',
  Mateo: 'Mateo · Estudiante',
};

/** Page Object for the policy console served at /admin/policy-console. Specs use only this class for UI access. */
export class PolicyConsolePage {
  readonly page: Page;
  readonly banner: Locator;
  readonly statusMessage: Locator;
  private readonly consequences: Locator;

  constructor(page: Page) {
    this.page = page;
    this.banner = page.getByRole('alert').filter({ hasText: 'FLEET COMPUTE FROZEN - EXAM IN PROGRESS' });
    this.statusMessage = page.getByRole('status');
    this.consequences = page.getByRole('heading', { name: 'Revisión antes de activar' });
  }

  async open(): Promise<void> {
    await this.page.goto('/admin/policy-console');
    await expect(this.page.getByRole('heading', { name: 'Protección del laboratorio' })).toBeVisible();
  }

  /** The console's own "session": the participant selector sends that participant's bearer token. */
  async actAs(participant: Participant): Promise<void> {
    await this.page.getByLabel('Participante').selectOption({ label: PARTICIPANT_LABEL[participant] });
    await expect(this.statusMessage).toHaveText('Sesión actualizada.');
  }

  async createFreezeDraft(draft: { scope?: 'Toda la flota' | 'Asignaturas' | 'Clase de nodo'; reason: string }): Promise<void> {
    await this.page.getByLabel('Alcance').selectOption({ label: draft.scope ?? 'Toda la flota' });
    await this.page.getByLabel('Motivo', { exact: true }).fill(draft.reason);
    await this.page.getByRole('button', { name: 'Crear borrador y revisar consecuencias' }).click();
  }

  /** Step 2 of the UX contract: the operator must see the consequences before confirming. Returns the summary text. */
  async reviewConsequences(): Promise<string> {
    await expect(this.consequences).toBeVisible();
    const summary = this.page.getByText(/Trabajos afectados:/);
    await expect(summary).toBeVisible();
    return (await summary.textContent()) ?? '';
  }

  async confirmActivation(): Promise<void> {
    await this.page.getByRole('button', { name: 'Confirmar y activar congelación' }).click();
    await expect(this.statusMessage).toHaveText('Congelación activada.');
  }

  async refreshFreezes(): Promise<void> {
    await this.page.getByRole('button', { name: 'Actualizar congelaciones' }).click();
  }

  freezeRow(state: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: state, exact: true }) });
  }

  /** Rows are listed oldest first, and the server keeps history across scenarios, so the newest matching row is the last one. */
  latestFreezeRow(state: string): Locator {
    return this.freezeRow(state).last();
  }

  async liftFreeze(reason: string): Promise<void> {
    const row = this.freezeRow('ACTIVE');
    await row.getByRole('textbox', { name: /Motivo para levantar/ }).fill(reason);
    await row.getByRole('button', { name: 'Levantar' }).click();
    await expect(this.statusMessage).toHaveText('Congelación levantada.');
  }
}
