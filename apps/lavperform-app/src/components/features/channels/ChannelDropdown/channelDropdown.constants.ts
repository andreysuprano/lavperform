import { BsWhatsapp } from 'react-icons/bs'
import {
  MdOutlineEmail,
  MdOutlineNotificationsActive,
  MdOutlineSms,
} from 'react-icons/md'
import { RiWirelessChargingLine } from 'react-icons/ri'
import { TbBrandMeta } from 'react-icons/tb'

import type { DropdownChannel } from './ChannelDropdown.types'

export const DROPDOWN_CHANNELS: DropdownChannel[] = [
  { name: 'WhatsApp', icon: BsWhatsapp, showStatus: true },
  { name: 'WhatsApp Business API', icon: TbBrandMeta, showMetaStatus: true },
  { name: 'Email', icon: MdOutlineEmail },
  { name: 'SMS', icon: MdOutlineSms, showActiveBadge: true },
  { name: 'RCS', icon: RiWirelessChargingLine },
  { name: 'Push Notification', icon: MdOutlineNotificationsActive },
]
