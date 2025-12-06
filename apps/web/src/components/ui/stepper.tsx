import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, Loader2, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

// Context to share state between Stepper components
interface StepperContextValue extends StepperProps {
    activeStep: number
    setActiveStep: (step: number) => void
}

const StepperContext = React.createContext<StepperContextValue | undefined>(
    undefined
)

function useStepper() {
    const context = React.useContext(StepperContext)
    if (!context) {
        throw new Error("useStepper must be used within a Stepper")
    }
    return context
}

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultValue?: number
    value?: number
    onValueChange?: (step: number) => void
    orientation?: "horizontal" | "vertical"
    indicators?: {
        completed?: React.ReactNode
        loading?: React.ReactNode
        active?: React.ReactNode
        inactive?: React.ReactNode
    }
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
    (
        {
            defaultValue = 0,
            value,
            onValueChange,
            orientation = "horizontal",
            indicators,
            className,
            children,
            ...props
        },
        ref
    ) => {
        const [uncontrolledStep, setUncontrolledStep] = React.useState(defaultValue)
        const isControlled = value !== undefined
        const activeStep = isControlled ? (value as number) : uncontrolledStep

        const setActiveStep = React.useCallback(
            (step: number) => {
                if (!isControlled) {
                    setUncontrolledStep(step)
                }
                onValueChange?.(step)
            },
            [isControlled, onValueChange]
        )

        return (
            <StepperContext.Provider
                value={{
                    activeStep,
                    setActiveStep,
                    orientation,
                    indicators,
                }}
            >
                <div
                    ref={ref}
                    className={cn(
                        "flex w-full",
                        orientation === "vertical" ? "flex-col" : "flex-row",
                        className
                    )}
                    {...props}
                >
                    {children}
                </div>
            </StepperContext.Provider>
        )
    }
)
Stepper.displayName = "Stepper"

const StepperNav = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { orientation } = useStepper()
    return (
        <div
            ref={ref}
            className={cn(
                "flex",
                orientation === "vertical" ? "flex-col" : "flex-row w-full items-center",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
StepperNav.displayName = "StepperNav"

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
    step: number
    loading?: boolean
    completed?: boolean
}

const StepperItem = React.forwardRef<HTMLDivElement, StepperItemProps>(
    ({ step, loading, completed, className, children, ...props }, ref) => {
        const { activeStep } = useStepper()

        // Determine state
        const isActive = step === activeStep
        const isCompleted = step < activeStep || completed

        // Data attributes for styling
        const state = loading
            ? "loading"
            : isCompleted
                ? "completed"
                : isActive
                    ? "active"
                    : "inactive"

        return (
            <div
                ref={ref}
                data-state={state}
                data-step={step}
                className={cn("group/step flex flex-col", className)}
                {...props}
            >
                {children}
            </div>
        )
    }
)
StepperItem.displayName = "StepperItem"

const StepperTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    return (
        <button
            ref={ref}
            className={cn("flex items-center gap-3", className)}
            {...props}
        >
            {children}
        </button>
    )
})
StepperTrigger.displayName = "StepperTrigger"

const StepperIndicator = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { indicators } = useStepper()
    // We need to access the parent StepperItem's state. 
    // In a real generic component we might context this, but CSS classes work well here with group/step

    return (
        <div
            ref={ref}
            className={cn(
                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors duration-200",
                // Default styles (inactive)
                "border-muted text-muted-foreground",
                // Active styles
                "group-data-[state=active]/step:border-primary group-data-[state=active]/step:bg-primary group-data-[state=active]/step:text-primary-foreground",
                // Completed styles
                "group-data-[state=completed]/step:border-primary group-data-[state=completed]/step:bg-primary group-data-[state=completed]/step:text-primary-foreground",
                // Loading styles
                "group-data-[state=loading]/step:border-primary",
                className
            )}
            {...props}
        >
            {/* Logic to show checkmark or custom indicator if completed */}
            <span className="hidden group-data-[state=completed]/step:block">
                {indicators?.completed ?? <Check className="h-4 w-4" />}
            </span>
            <span className="hidden group-data-[state=loading]/step:block">
                {indicators?.loading ?? <Loader2 className="h-4 w-4 animate-spin" />}
            </span>
            <span className="block group-data-[state=completed]/step:hidden group-data-[state=loading]/step:hidden">
                {children}
            </span>
        </div>
    )
})
StepperIndicator.displayName = "StepperIndicator"

const StepperTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
    return (
        <h3
            ref={ref}
            className={cn("text-sm font-medium whitespace-nowrap", className)}
            {...props}
        >
            {children}
        </h3>
    )
})
StepperTitle.displayName = "StepperTitle"

const StepperDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
    return (
        <p
            ref={ref}
            className={cn("text-xs text-muted-foreground", className)}
            {...props}
        >
            {children}
        </p>
    )
})
StepperDescription.displayName = "StepperDescription"

const StepperSeparator = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "bg-muted transition-colors duration-200",
                // Vertical line
                "group-data-[orientation=vertical]/stepper-nav:w-[2px]",
                // Horizontal line
                "group-data-[orientation=horizontal]/stepper-nav:h-[2px] group-data-[orientation=horizontal]/stepper-nav:flex-1",
                // Completed state
                "group-data-[state=completed]/step:bg-primary",
                className
            )}
            {...props}
        />
    )
})
StepperSeparator.displayName = "StepperSeparator"

const StepperPanel = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    return (
        <div ref={ref} className={cn("mt-4", className)} {...props}>
            {children}
        </div>
    )
})
StepperPanel.displayName = "StepperPanel"

interface StepperContentProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number
}

const StepperContent = React.forwardRef<HTMLDivElement, StepperContentProps>(
    ({ value, className, children, ...props }, ref) => {
        const { activeStep } = useStepper()

        if (value !== activeStep) return null

        return (
            <div
                ref={ref}
                className={cn("animate-in fade-in-50 slide-in-from-bottom-2", className)}
                {...props}
            >
                {children}
            </div>
        )
    }
)
StepperContent.displayName = "StepperContent"

export {
    Stepper,
    StepperNav,
    StepperItem,
    StepperTrigger,
    StepperIndicator,
    StepperTitle,
    StepperDescription,
    StepperSeparator,
    StepperPanel,
    StepperContent,
}
