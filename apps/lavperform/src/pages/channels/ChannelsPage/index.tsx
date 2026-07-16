import { LuRadio } from 'react-icons/lu'

import { AppContentLayout, ChannelList } from '@/components'

export const ChannelsPage = () => {
  return (
    <AppContentLayout
      icon={<LuRadio />}
      title="Canais de Comunicação"
    >
      <ChannelList />
    </AppContentLayout>
  )
}
