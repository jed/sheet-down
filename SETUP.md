Setting up a Google Spreadsheet for SheetDOWN
=============================================

1. Follow [these steps](https://github.com/jed/google-oauth-jwt-stream/blob/master/SETUP.md) to get the email and key needed to create tokens.

2. Go to https://docs.google.com/spreadsheets, and click the **+** button in the lower right.

  ![screen shot 2015-03-08 at 12 11 31 am](https://cloud.githubusercontent.com/assets/4433/6544649/1e39e17a-c528-11e4-8188-dc5fff304894.png)

3. Name your new spreadsheet, and then click **Share** in the upper right.

  ![screen shot 2015-03-08 at 12 02 14 am](https://cloud.githubusercontent.com/assets/4433/6544646/1e2ec24a-c528-11e4-8165-5083b0176844.png)

4. Enter the email address of your service account as obtained from step 1, and click **Done**.

  ![screen shot 2015-03-08 at 12 03 02 am](https://cloud.githubusercontent.com/assets/4433/6544648/1e30a100-c528-11e4-9638-23e5506689bc.png)

5. Get the ID of your spreadsheet from the URL of the page. The ID is all of the characters after `spreadsheets/d/` but before `/edit`.

6. Get the ID of the worksheet within the spreadsheet. If your spreadsheet only has the default `Sheet1` worksheet, the worksheet ID is `od6`. Otherwise, you'll need to open the following file and see if you can find the appropriate worksheet by name:

`https://spreadsheets.google.com/feeds/worksheets/<spreadsheet-id>/private/full`

7. Concatenate the spreadsheet ID from step 5 and the worksheet ID from step 6 with `/` as a separator to get the location used for SheetDOWN.
