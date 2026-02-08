import { groupByKey } from "$lib/utils/grouping";

export const pointsDistributionBySubfield = {
    Brojevi: 10,
    "Algebra i funkcije": 50,
    "Oblik i prostor": 15,
    Mjerenje: 20,
    "Podatci, statistika i vjerojatnost": 5,
};

export function calculateExamProgress(objectives) {
    const grouped = groupByKey(
        objectives,
        "fieldName",
        (current) => ({
            fieldName: current.fieldName,
            numOfObjectivesInField: 1,
            numberOfMasteredObjectivesInField: current.isMastered ? 1 : 0,
        }),
        (lastGroup, current) => {
            lastGroup.numOfObjectivesInField += 1;
            if (current.isMastered) {
                lastGroup.numberOfMasteredObjectivesInField += 1;
            }
        },
    );

    return Math.ceil(grouped.reduce((total, group) => {
        const distribution = pointsDistributionBySubfield[group.fieldName] ?? 0;

        return (
            total +
            distribution *
            (group.numberOfMasteredObjectivesInField /
                group.numOfObjectivesInField)
        );
    }, 0));
}
