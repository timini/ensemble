import type { Meta, StoryObj } from "@storybook/nextjs";

import RouteError from "./RouteError";

const meta: Meta<typeof RouteError> = {
  title: "App/RouteError",
  component: RouteError,
  argTypes: {
    reset: { action: "reset" },
  },
  args: {
    error: new Error("Storybook route error"),
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
