import { groupByKey } from "$lib/utils/grouping";

export const pointsDistributionByCourse = {
    1: {
        Brojevi: 10,
        "Algebra i funkcije": 50,
        "Oblik i prostor": 15,
        Mjerenje: 20,
        "Podatci, statistika i vjerojatnost": 5,
    },
    2: {
        Brojevi: 20,
        "Algebra i funkcije": 40,
        "Oblik i prostor": 15,
        Mjerenje: 15,
        "Podatci, statistika i vjerojatnost": 10,
    },
};


export function calculateExamProgress(objectives, courseId) {
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

    const distributionMap =
        pointsDistributionByCourse[courseId]

    return Math.ceil(
        grouped.reduce((total, group) => {
            const distribution = distributionMap[group.fieldName] ?? 0;

            return (
                total +
                distribution *
                (group.numberOfMasteredObjectivesInField /
                    group.numOfObjectivesInField)
            );
        }, 0),
    );
}

