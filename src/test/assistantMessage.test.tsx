import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '@/components/assistant/AssistantWidget';
import type { AssistantMessage } from '@/hooks/useAssistant';

const base: AssistantMessage = {
  id: '1',
  role: 'assistant',
  content: '',
  status: 'completed',
  attachments: [],
  result: null,
  createdAt: new Date().toISOString(),
};

describe('AssistantWidget MessageBubble', () => {
  it('affiche le vrai texte Hermes après /complete-job', () => {
    render(
      <MessageBubble
        message={{
          ...base,
          content: "Bonjour ! Je suis l'assistant Powertech. Comment puis-je vous aider ?",
          result: { status: 'completed', action: 'libre', warnings: [], missing_fields: [] },
        }}
      />,
    );
    expect(
      screen.getByText("Bonjour ! Je suis l'assistant Powertech. Comment puis-je vous aider ?"),
    ).toBeInTheDocument();
    // Le badge de statut reste visible sans remplacer la réponse
    expect(screen.getByText('Réponse reçue')).toBeInTheDocument();
  });

  it('affiche avertissements et informations manquantes', () => {
    render(
      <MessageBubble
        message={{
          ...base,
          content: 'Devis brouillon créé.',
          result: { warnings: ['Prix estimé'], missing_fields: ['vin'] },
        }}
      />,
    );
    expect(screen.getByText('Devis brouillon créé.')).toBeInTheDocument();
    expect(screen.getByText('Prix estimé')).toBeInTheDocument();
    expect(screen.getByText('vin')).toBeInTheDocument();
  });
});
