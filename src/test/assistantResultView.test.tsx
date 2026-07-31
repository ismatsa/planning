import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '@/components/assistant/AssistantWidget';
import { statusLabel, summaryRows, actionLabel } from '@/components/assistant/resultView';
import type { AssistantMessage } from '@/hooks/useAssistant';

const base: AssistantMessage = {
  id: '1',
  role: 'assistant',
  content: '',
  status: 'needs_information',
  attachments: [],
  result: null,
  createdAt: new Date().toISOString(),
};

describe('rendu structuré Hermes', () => {
  it('rend la réponse needs_information sans [object Object] ni "Action réalisée"', () => {
    const { container } = render(
      <MessageBubble
        message={{
          ...base,
          content: 'Analyse en cours…',
          result: {
            status: 'needs_information',
            message: 'Merci de préciser le VIN et la prestation souhaitée.',
            action: { type: 'none', performed: false },
            summary: {},
            missing_fields: ['VIN', 'Prestation'],
            warnings: ['Aucune modification n’a été effectuée.'],
          },
        }}
      />,
    );
    expect(screen.getByText('Information manquante')).toBeInTheDocument();
    expect(screen.getByText('Merci de préciser le VIN et la prestation souhaitée.')).toBeInTheDocument();
    expect(screen.getByText('VIN')).toBeInTheDocument();
    expect(screen.getByText('Prestation')).toBeInTheDocument();
    expect(screen.getByText('Aucune modification n’a été effectuée.')).toBeInTheDocument();
    expect(screen.getByText('Aucune modification effectuée')).toBeInTheDocument();
    expect(container.textContent).not.toContain('[object Object]');
    expect(container.textContent).not.toContain('Action réalisée');
  });

  it('statut completed dépend de action.performed', () => {
    expect(statusLabel('completed', { action: { performed: true } })).toBe('Action réalisée');
    expect(statusLabel('completed', { action: { performed: false } })).toBe('Réponse reçue');
    expect(statusLabel('completed', { missing_fields: ['VIN'], action: { performed: true } })).toBe('Réponse reçue');
    expect(statusLabel('failed')).toBe('Erreur');
  });

  it('résumé : uniquement des libellés métier connus', () => {
    expect(summaryRows({ client: 'Ali Ben', vin: 'WDD123', internal_id: 'uuid', meta: { a: 1 }, devis: null }))
      .toEqual([{ label: 'Client', value: 'Ali Ben' }, { label: 'VIN', value: 'WDD123' }]);
  });

  it('action : phrase lisible ou rien', () => {
    expect(actionLabel({ type: 'devis_created', performed: true })).toBe('Devis brouillon créé');
    expect(actionLabel({ type: 'none', performed: false })).toBe('Aucune modification effectuée');
    expect(actionLabel(null)).toBeNull();
  });
});
