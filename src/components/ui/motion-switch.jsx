"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cva } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const switchVariants = cva(
    "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            size: {
                sm: "h-5 w-9",
                default: "h-6 w-11",
                lg: "h-8 w-14",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

const thumbVariants = cva(
    "pointer-events-none block rounded-full bg-background shadow-lg ring-0",
    {
        variants: {
            size: {
                sm: "size-4",
                default: "size-5",
                lg: "size-6",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

const MotionThumb = motion.create(SwitchPrimitives.Thumb)

const Switch = React.forwardRef(
    ({ className, size, ...props }, ref) => {
        const isChecked = props.checked ?? false

        return (
            <SwitchPrimitives.Root
                className={cn(
                    switchVariants({ size }),
                    "data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input",
                    className
                )}
                {...props}
                ref={ref}
            >
                <MotionThumb
                    className={cn(thumbVariants({ size }))}
                    layout
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                    }}
                    style={{
                        marginLeft: isChecked ? "auto" : "2px",
                        marginRight: isChecked ? "2px" : "auto",
                    }}
                />
            </SwitchPrimitives.Root>
        )
    }
)
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
