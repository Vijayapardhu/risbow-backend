import { ReactNode } from "react";
type ComplianceCardProps = {
    id: string;
    title: string;
    subtitle: string;
    bullets: string[];
    icon: ReactNode;
};
export declare function ComplianceCard({ id, title, subtitle, bullets, icon }: ComplianceCardProps): any;
export {};
