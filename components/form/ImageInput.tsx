import { Input } from '../ui/input'
import { Label } from '../ui/label'
import React from 'react'

export default function ImageInput() {
  const name = 'image';   
  return (
    <div className='mb-2'>
        <Label htmlFor='{name}' className='capitalize'>Image</Label>
        <Input id={name} 
        name={name} type='file' 
        required accept="iamge/*"
        className='max-w-xs'>
            
        </Input>
    </div>
  )
}
