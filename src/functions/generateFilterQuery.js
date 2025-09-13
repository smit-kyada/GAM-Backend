

import _ from "lodash";

const Tables = {
    userTbl: ['userName', 'email', 'role'],
    userNum: ['contact'],
    SiteTableTbl: ['site'],
    DeductionTbl: ['site_link'],
    SitTableNum: ['estimatedEarning', 'pageViews', 'pageRpm', 'impressions', 'impressionsRpm', 'activeViewViewable', 'clicks'],
    AffRequestTbl: ['name', 'email', 'message'],
    BankDetailTbl: ['bankName', 'ifscCode', 'swiftCode'],
    siteTbl: ['site', 'description'],
    messageTbl: ['title', 'description', 'url'],
    messageLogTbl: ['site'],
    gameUserTbl: ['userIp', 'uUrl', 'city', 'region', 'country', 'country_code'],
    NotificationMessageTbl: ['title', 'color'],
    AccountTbl: ["bankName", "IFSC", "accountHolderName", "accountNumber", "accountType", "GstNumber", "GstCertificate"],

}

export const FilterQuery = (filterString, tableKey) => {
    if (filterString && filterString?.length > 0) {
        const keys = Tables[tableKey];
        let syntax = [];

        switch (tableKey) {
            case 'userTbl':
                Tables?.userNum?.forEach((ele) => {
                    syntax.push({
                        $expr: {
                            $regexMatch: {
                                input: { $toString: `$${ele}` },
                                regex: filterString
                            }
                        }
                    });
                });
                break;
            case 'SiteTableTbl':
                Tables?.SitTableNum?.forEach((ele) => {
                    syntax.push({
                        $expr: {
                            $regexMatch: {
                                input: { $toString: `$${ele}` },
                                regex: filterString
                            }
                        }
                    });
                });
                break;
        }

        keys?.forEach((ele) => {
            syntax.push({ [ele]: { $regex: filterString, $options: "i" } });
        });

        return { $and: [{ isDeleted: false }, { $or: syntax }] };
    } else {
        return { isDeleted: false };
    }
};