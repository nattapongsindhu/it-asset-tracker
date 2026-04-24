'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

type DivProps = React.HTMLAttributes<HTMLDivElement>

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-slate-950/45 data-[state=open]:animate-in data-[state=closed]:animate-out ${className}`.trim()}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className = '', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20 focus:outline-none sm:p-7 ${className}`.trim()}
      {...props}
    />
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className = '', ...props }: DivProps) {
  return <div className={`flex flex-col space-y-2 text-left ${className}`.trim()} {...props} />
}

function DialogDescription({
  className = '',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={`text-sm leading-6 text-slate-500 ${className}`.trim()}
      {...props}
    />
  )
}

function DialogTitle({
  className = '',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={`text-2xl font-semibold text-slate-900 ${className}`.trim()}
      {...props}
    />
  )
}

export { DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogTitle }
