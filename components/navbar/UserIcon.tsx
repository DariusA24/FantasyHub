'use client'

import { useEffect, useState } from 'react'
import { LuUser } from 'react-icons/lu'
import { fetchProfileImage } from '../../utils/actions'

function UserIcon() {
  const [profileImage, setProfileImage] = useState<string | null>(null)

  useEffect(() => {
    const getProfileImage = async () => {
      try {
        const image = await fetchProfileImage()
        setProfileImage(image ?? null)
      } catch (error) {
        console.error('Failed to fetch profile image:', error)
      }
    }
    getProfileImage()
  }, [])

  if (profileImage) {
    return <img src={profileImage} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
  }

  return <LuUser className="w-6 h-6 bg-primary rounded-full text-black" />
}

export default UserIcon