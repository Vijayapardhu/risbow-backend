type TimelineItem = {
    title: string;
    period: string;
    detail: string;
};
type TimelineProps = {
    items: TimelineItem[];
};
export declare function Timeline({ items }: TimelineProps): any;
export {};
