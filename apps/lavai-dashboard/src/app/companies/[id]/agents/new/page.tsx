'use client';

import { useParams } from 'next/navigation';
import { CreateAgentScreen } from '@/components/agents/create-agent-screen';

export default function NewAgentPage() {
  const { id } = useParams<{ id: string }>();
  return <CreateAgentScreen companyId={id} />;
}
